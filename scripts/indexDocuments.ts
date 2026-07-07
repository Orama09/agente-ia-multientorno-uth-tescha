import fs from "fs";
import path from "path";
import axios from "axios";
import pdfParse from "pdf-parse";
import { loadEnvFiles } from "../src/lib/loadEnv";
import {
  CHROMA_COLLECTION_NAME,
  OLLAMA_EMBEDDING_MODEL,
  OLLAMA_URL,
  chromaPaths,
} from "../src/lib/config";

loadEnvFiles();

const DOCUMENTS_PATH = path.join(process.cwd(), "documents");

async function getEmbedding(text: string) {
  const res = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
    model: OLLAMA_EMBEDDING_MODEL,
    prompt: text,
  });

  let embedding =
    res.data.embedding || res.data?.data?.[0]?.embedding;

  if (!embedding) {
    throw new Error("Embedding vacío");
  }

  embedding = embedding.map((v: number) => Number(v));

  if (embedding.length !== 768) {
    throw new Error(`Dimensión inválida: ${embedding.length}`);
  }

  return embedding;
}

async function createCollection() {
  const res = await axios.get(chromaPaths.collections());

  const existing = res.data.find(
    (c: { name: string }) => c.name === CHROMA_COLLECTION_NAME
  );

  if (existing) {
    console.log("✅ Colección encontrada:", existing.name);
    return existing.id;
  }

  const created = await axios.post(
    chromaPaths.collections(),
    { name: CHROMA_COLLECTION_NAME },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  console.log("✅ Colección creada:", created.data.name);
  return created.data.id;
}

async function documentExists(collectionId: string, fileName: string) {
  try {
    const res = await axios.post(`${chromaPaths.collection(collectionId)}/get`, {
      where: {
        source: fileName,
      },
      limit: 1,
    });

    return res.data?.ids?.length > 0;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("⚠️ Error verificando documento:", message);
    return false;
  }
}

function cleanText(text: string) {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitText(text: string) {
  const chunkSize = 700;
  const overlap = 120;
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    const chunk = text.slice(i, i + chunkSize).trim();
    if (chunk.length > 80) chunks.push(chunk);
  }

  return chunks;
}

async function extractPDFText(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return cleanText(data.text);
}

async function indexDocuments() {
  console.log("🚀 Iniciando indexación...");
  console.log(`   Ollama: ${OLLAMA_URL}`);
  console.log(`   Chroma: ${chromaPaths.collections()}\n`);

  if (!fs.existsSync(DOCUMENTS_PATH)) {
    console.log("❌ Carpeta documents no encontrada");
    return;
  }

  const collectionId = await createCollection();

  const files = fs.readdirSync(DOCUMENTS_PATH);
  console.log("📂 Archivos encontrados:", files);

  for (const file of files) {
    if (!file.endsWith(".pdf")) continue;

    console.log(`\n📄 Procesando: ${file}`);

    const alreadyExists = await documentExists(collectionId, file);

    if (alreadyExists) {
      console.log(`⏭️ ${file} ya indexado, se omite`);
      continue;
    }

    const filePath = path.join(DOCUMENTS_PATH, file);
    const text = await extractPDFText(filePath);

    console.log("🧾 Caracteres:", text.length);

    const chunks = splitText(text);
    console.log("🔹 Chunks:", chunks.length);

    const ids: string[] = [];
    const documents: string[] = [];
    const embeddings: number[][] = [];
    const metadatas: Array<{ source: string; chunk: number; total: number }> =
      [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await getEmbedding(chunks[i]);

        ids.push(`${file}-chunk-${i}`);
        documents.push(chunks[i]);
        embeddings.push(embedding);

        metadatas.push({
          source: file,
          chunk: i + 1,
          total: chunks.length,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`⚠️ Chunk ${i} omitido:`, message);
      }
    }

    console.log("🧠 Embeddings válidos:", embeddings.length);

    if (
      embeddings.length === 0 ||
      ids.length !== embeddings.length ||
      documents.length !== embeddings.length
    ) {
      console.log("❌ Datos inconsistentes, archivo omitido");
      continue;
    }

    try {
      await axios.post(
        `${chromaPaths.collection(collectionId)}/upsert`,
        {
          ids,
          documents,
          embeddings,
          metadatas,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`✅ Indexados: ${embeddings.length}/${chunks.length}`);
    } catch (err: unknown) {
      console.log("❌ Error en Chroma:");
      if (axios.isAxiosError(err)) {
        console.log(err.response?.data || err.message);
      } else {
        console.log(err);
      }
    }
  }

  console.log("\n🎉 Indexación completa");
}

indexDocuments()
  .then(() => console.log("🏁 Proceso finalizado"))
  .catch((err) => console.error("❌ Error:", err));
