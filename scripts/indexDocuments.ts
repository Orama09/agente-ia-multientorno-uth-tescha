import fs from "fs";
import path from "path";
import axios from "axios";
import pdfParse from "pdf-parse";
import { GoogleGenAI } from "@google/genai"; 
import { loadEnvFiles } from "../src/lib/loadEnv";
import {
  CHROMA_COLLECTION_NAME,
  chromaPaths,
} from "../src/lib/config";

// Cargar variables de entorno (.env)
loadEnvFiles();

// Detecta automáticamente si la carpeta es 'school_documents' o 'documents'
const getDocumentsPath = () => {
  const schoolDocs = path.join(process.cwd(), "school_documents");
  if (fs.existsSync(schoolDocs)) return schoolDocs;
  return path.join(process.cwd(), "documents");
};

const DOCUMENTS_PATH = getDocumentsPath();

// 👇 NOTA: "text-embedding-004" fue descontinuado por Google.
// El modelo vigente para texto es "gemini-embedding-001".
// Por defecto produce vectores de 3072 dimensiones, pero aquí lo
// truncamos a 768 con outputDimensionality para que sea compatible
// con colecciones de Chroma creadas previamente con text-embedding-004
// (que también usaba 768 dims). Si tu colección es nueva, puedes subir
// esto a 1536 o 3072 para mejor calidad (ver notas al final del archivo).
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS: number = 768;

/**
 * Genera embeddings vectoriales utilizando la librería oficial @google/genai.
 * Compatible con Auth Keys (AQ...) y Standard Keys.
 */
async function getEmbedding(text: string): Promise<number[]> {
  // Evaluación dinámica compatible con GEMINI_API_KEY y GOOGLE_API_KEY
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "❌ No se encontró GEMINI_API_KEY ni GOOGLE_API_KEY en las variables de entorno"
    );
  }

  // Inicialización de la instancia oficial de GoogleGenAI
  const ai = new GoogleGenAI({ apiKey });

  try {
    // Petición de embedding con la nueva sintaxis
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: {
        // RETRIEVAL_DOCUMENT: optimizado para indexar contenido que luego
        // será buscado (a diferencia de RETRIEVAL_QUERY, que se usaría al
        // generar el embedding de la pregunta del usuario en tu buscador).
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    });

    let values = response.embeddings?.[0]?.values;

    if (values && values.length > 0) {
      const vector = Array.from(values).map((v) => Number(v));

      // gemini-embedding-001 NO normaliza automáticamente los vectores
      // truncados (a diferencia de gemini-embedding-2). Si usamos menos
      // de 3072 dimensiones, hay que normalizar manualmente para que la
      // similitud coseno funcione correctamente.
      if (EMBEDDING_DIMENSIONS !== 3072) {
        return normalizeVector(vector);
      }

      return vector;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Error en Gemini Embedding: ${errorMsg}`);
  }

  throw new Error("Embedding vacío devuelto por Gemini API");
}

/**
 * Normaliza un vector a norma 1 (magnitud 1), requerido manualmente
 * para dimensiones truncadas de gemini-embedding-001.
 */
function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

async function createCollection(): Promise<string> {
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

async function documentExists(
  collectionId: string,
  fileName: string
): Promise<boolean> {
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

function cleanText(text: string): string {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitText(text: string): string[] {
  const chunkSize = 700;
  const overlap = 120;
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    const chunk = text.slice(i, i + chunkSize).trim();
    if (chunk.length > 80) chunks.push(chunk);
  }

  return chunks;
}

async function extractFileText(filePath: string): Promise<string> {
  if (filePath.endsWith(".pdf")) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return cleanText(data.text);
  } else if (filePath.endsWith(".txt")) {
    const text = fs.readFileSync(filePath, "utf-8");
    return cleanText(text);
  }
  return "";
}

async function indexDocuments() {
  console.log("🚀 Iniciando indexación con Google Gemini SDK (@google/genai)...");
  console.log(` 📂 Carpeta origen: ${DOCUMENTS_PATH}`);
  console.log(` 📦 Chroma API: ${chromaPaths.collections()}`);
  console.log(` 🧠 Modelo de embeddings: ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS} dims)\n`);

  if (!fs.existsSync(DOCUMENTS_PATH)) {
    console.log(`❌ Carpeta de documentos no encontrada en: ${DOCUMENTS_PATH}`);
    return;
  }

  const collectionId = await createCollection();

  const files = fs.readdirSync(DOCUMENTS_PATH);
  console.log("📂 Archivos encontrados:", files);

  for (const file of files) {
    if (!file.endsWith(".pdf") && !file.endsWith(".txt")) continue;

    console.log(`\n📄 Procesando: ${file}`);

    const alreadyExists = await documentExists(collectionId, file);

    if (alreadyExists) {
      console.log(`⏭️ ${file} ya indexado, se omite`);
      continue;
    }

    const filePath = path.join(DOCUMENTS_PATH, file);
    const text = await extractFileText(filePath);

    if (!text) {
      console.log(`⚠️ No se extrajo texto útil de ${file}, se omite`);
      continue;
    }

    console.log("🧾 Caracteres:", text.length);

    const chunks = splitText(text);
    console.log("🔹 Chunks:", chunks.length);

    const ids: string[] = [];
    const documents: string[] = [];
    const embeddings: number[][] = [];
    const metadatas: Array<{ source: string; chunk: number; total: number }> = [];

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

    console.log("🧠 Embeddings Gemini válidos:", embeddings.length);

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

      console.log(`✅ Indexados en ChromaDB: ${embeddings.length}/${chunks.length}`);
    } catch (err: unknown) {
      console.log("❌ Error en ChromaDB:");
      if (axios.isAxiosError(err)) {
        console.log(err.response?.data || err.message);
      } else {
        console.log(err);
      }
    }
  }

  console.log("\n🎉 Indexación completa con Gemini");
}

indexDocuments()
  .then(() => console.log("🏁 Proceso finalizado exitosamente"))
  .catch((err) => console.error("❌ Error en la ejecución:", err));

/*
 * ============================================================
 * NOTAS DE LA CORRECCIÓN
 * ============================================================
 *
 * 1. CAUSA DEL ERROR ORIGINAL
 *    El modelo "text-embedding-004" fue descontinuado por Google.
 *    Cada llamada a embedContent devolvía 404 NOT_FOUND, por lo que
 *    "Embeddings Gemini válidos" siempre daba 0 y el script omitía
 *    todos los archivos.
 *
 * 2. CAMBIO PRINCIPAL
 *    Se reemplazó el modelo por "gemini-embedding-001" (vigente),
 *    y se agregó `taskType: "RETRIEVAL_DOCUMENT"` en la config, que
 *    optimiza los embeddings para búsqueda/recuperación de documentos.
 *
 * 3. DIMENSIONES Y COMPATIBILIDAD CON CHROMA
 *    - text-embedding-004 generaba vectores de 768 dimensiones.
 *    - gemini-embedding-001 genera 3072 por defecto, pero admite
 *      truncar a 768 o 1536 con `outputDimensionality`.
 *    - Aquí se dejó en 768 para que sea compatible con una colección
 *      de Chroma ya existente creada con el modelo viejo.
 *    - SI TU COLECCIÓN DE CHROMA ES NUEVA o no te importa reindexar
 *      todo, puedes subir EMBEDDING_DIMENSIONS a 1536 o 3072 para
 *      mejor calidad semántica.
 *    - IMPORTANTE: si cambias EMBEDDING_DIMENSIONS después de haber
 *      indexado algo con una dimensión distinta, tendrás vectores de
 *      tamaños incompatibles en la misma colección. En ese caso borra
 *      la colección de Chroma y vuelve a indexar todo desde cero.
 *
 * 4. NORMALIZACIÓN MANUAL
 *    gemini-embedding-001 NO normaliza automáticamente los vectores
 *    truncados (menos de 3072 dims). Se agregó la función
 *    `normalizeVector` para dividir cada vector entre su norma L2,
 *    lo cual es necesario para que la similitud coseno sea correcta.
 *    (El modelo más nuevo, "gemini-embedding-2", sí normaliza
 *    automáticamente, pero es multimodal y tiene otra forma de
 *    especificar la tarea — no un simple `taskType`).
 *
 * 5. LÍMITE DE TOKENS DE ENTRADA
 *    gemini-embedding-001 acepta hasta 2,048 tokens por entrada
 *    (antes el límite con 004 era mayor). Tu `chunkSize` de 700
 *    caracteres está muy por debajo de eso, así que no debería
 *    haber problema, pero tenlo en cuenta si cambias el tamaño de
 *    los chunks.
 *
 * 6. SI QUIERES USAR ESTE MISMO EMBEDDING PARA BUSCAR (no solo indexar)
 *    Cuando generes el embedding de la pregunta del usuario en tu
 *    buscador, usa `taskType: "RETRIEVAL_QUERY"` en lugar de
 *    "RETRIEVAL_DOCUMENT", y la MISMA dimensión (768 en este caso)
 *    para que las magnitudes sean comparables.
 * ============================================================
 */