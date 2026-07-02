// lib/rag.ts (CORREGIDO Y FUNCIONAL 🔥)
import fetch from "node-fetch";

const CHROMA_URL = "http://chroma:8000/api/v2";
const OLLAMA_URL = "http://ollama:11434";
const COLLECTION_NAME = "school_documents";

// 🔥 CONFIG PRO AJUSTADA
const MAX_DISTANCE = 2.0;   // menos estricto
const MAX_CHUNKS = 6;       // entero correcto

// Cache simple en memoria
const embeddingCache = new Map<string, number[]>();

type SourceItem = {
  id: number;
  source: string;
  preview: string;
};

type RetrieveResult = {
  context: string;
  sources: SourceItem[];
};

// =============================
// Obtener ID de colección
// =============================
async function getCollectionId(): Promise<string> {
  const res = await fetch(
    `${CHROMA_URL}/tenants/default_tenant/databases/default_database/collections`
  );

  const data: any[] = await res.json();

  const collection = data.find((c: any) => c.name === COLLECTION_NAME);

  if (!collection) {
    throw new Error("Colección no encontrada");
  }

  return collection.id;
}

// =============================
// Crear embedding con cache
// =============================
async function createEmbedding(text: string): Promise<number[] | null> {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }

  try {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nomic-embed-text",
        prompt: text,
      }),
    });

    const data: any = await res.json();

    const embedding =
      data.embedding ||
      data?.data?.[0]?.embedding ||
      null;

    if (!embedding) return null;

    const parsed = embedding.map((v: any) => Number(v));

    if (parsed.length !== 768) {
      console.log("⚠️ Dimensión incorrecta:", parsed.length);
      return null;
    }

    embeddingCache.set(text, parsed);

    return parsed;

  } catch (error) {
    console.error("❌ Error creando embedding:", error);
    return null;
  }
}

// =============================
// Chunking inteligente
// =============================
function splitText(text: string, chunkSize = 500, overlap = 100): string[] {
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    const chunk = text.slice(i, i + chunkSize).trim();
    if (chunk.length > 50) chunks.push(chunk);
  }

  return chunks;
}

// =============================
// Agregar documentos al RAG
// =============================
export async function addToRAG(
  text: string,
  source = "usuario"
): Promise<void> {
  try {
    const collectionId = await getCollectionId();

    const chunks = splitText(text);

    let inserted = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      const embedding = await createEmbedding(chunk);
      if (!embedding) continue;

      const id = `${source}-${Date.now()}-chunk-${i}`;

      await fetch(
        `${CHROMA_URL}/tenants/default_tenant/databases/default_database/collections/${collectionId}/upsert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ids: [id],
            embeddings: [embedding],
            documents: [chunk],
            metadatas: [
              {
                source,
                chunk: i + 1,
                total: chunks.length,
              },
            ],
          }),
        }
      );

      inserted++;
    }

    console.log(`✅ Chunks indexados: ${inserted}/${chunks.length}`);

  } catch (error) {
    console.error("❌ Error agregando al RAG:", error);
  }
}

// =============================
// Recuperar contexto (PRO REAL)
// =============================
export async function retrieveContext(
  userQuery: string,
  topK = 6
): Promise<RetrieveResult> {
  try {
    const collectionId = await getCollectionId();

    // 🔥 Query mejorada
    const enhancedQuery = `
El usuario está haciendo una pregunta sobre información institucional.

Pregunta:
${userQuery}

Busca información relevante aunque la pregunta sea general.
`;

    const embedding = await createEmbedding(enhancedQuery);
    if (!embedding) {
      return { context: "", sources: [] };
    }

    const chromaRes = await fetch(
      `${CHROMA_URL}/tenants/default_tenant/databases/default_database/collections/${collectionId}/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query_embeddings: [embedding],
          n_results: 10, // 🔥 MÁS RESULTADOS
          include: ["documents", "metadatas", "distances"],
        }),
      }
    );

    const data: any = await chromaRes.json();

    const documents: string[] = data.documents?.[0] || [];
    const metadatas: any[] = data.metadatas?.[0] || [];
    const distances: number[] = data.distances?.[0] || [];

    console.log("📊 Distancias:", distances);

    if (!documents.length) {
      return { context: "", sources: [] };
    }

    const results = documents.map((doc, i) => ({
      text: doc?.trim() || "",
      
      source: metadatas[i]?.source || "Documento",
      score: distances[i] ?? 999,
    }));

    // 🔥 FILTRO + ORDEN
    let filtered = results
      .filter((r) => r.text.length > 0 && r.score < MAX_DISTANCE)
      .sort((a, b) => a.score - b.score);

    // 🔥 FALLBACK INTELIGENTE
    if (!filtered.length) {
      console.log("⚠️ Usando fallback sin filtro...");
      filtered = results.sort((a, b) => a.score - b.score);
    }

    const bestChunks = filtered.slice(0, MAX_CHUNKS);

    const context = bestChunks
      .map((r) => r.text)
      .join("\n\n");

    const sources: SourceItem[] = bestChunks.map((r, i) => ({
      id: i + 1,
      source: r.source,
      preview: r.text.slice(0, 120) + "...",
    }));

    return { context, sources };

  } catch (error) {
    console.error("❌ Error RAG:", error);
    return { context: "", sources: [] };
  }
}