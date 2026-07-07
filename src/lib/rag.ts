import {
  CHROMA_COLLECTION_NAME,
  OLLAMA_EMBEDDING_MODEL,
  OLLAMA_URL,
  chromaPaths,
} from "./config";

const MAX_DISTANCE = 2.0;
const MAX_CHUNKS = 6;

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

async function getCollectionId(): Promise<string> {
  const res = await fetch(chromaPaths.collections());

  if (!res.ok) {
    throw new Error(`Chroma respondió con status ${res.status}`);
  }

  const data: Array<{ id: string; name: string }> = await res.json();

  const collection = data.find((c) => c.name === CHROMA_COLLECTION_NAME);

  if (!collection) {
    throw new Error("Colección no encontrada");
  }

  return collection.id;
}

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
        model: OLLAMA_EMBEDDING_MODEL,
        prompt: text,
      }),
    });

    if (!res.ok) {
      console.error("❌ Error creando embedding: status", res.status);
      return null;
    }

    const data: {
      embedding?: number[];
      data?: Array<{ embedding?: number[] }>;
    } = await res.json();

    const embedding =
      data.embedding || data?.data?.[0]?.embedding || null;

    if (!embedding) return null;

    const parsed = embedding.map((v) => Number(v));

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

function splitText(text: string, chunkSize = 500, overlap = 100): string[] {
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    const chunk = text.slice(i, i + chunkSize).trim();
    if (chunk.length > 50) chunks.push(chunk);
  }

  return chunks;
}

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

      await fetch(`${chromaPaths.collection(collectionId)}/upsert`, {
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
      });

      inserted++;
    }

    console.log(`✅ Chunks indexados: ${inserted}/${chunks.length}`);
  } catch (error) {
    console.error("❌ Error agregando al RAG:", error);
  }
}

export async function retrieveContext(
  userQuery: string,
  _topK = 6
): Promise<RetrieveResult> {
  try {
    const collectionId = await getCollectionId();

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

    const chromaRes = await fetch(`${chromaPaths.collection(collectionId)}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query_embeddings: [embedding],
        n_results: 10,
        include: ["documents", "metadatas", "distances"],
      }),
    });

    if (!chromaRes.ok) {
      console.error("❌ Error RAG: Chroma status", chromaRes.status);
      return { context: "", sources: [] };
    }

    const data: {
      documents?: string[][];
      metadatas?: Array<Array<{ source?: string }>>;
      distances?: number[][];
    } = await chromaRes.json();

    const documents: string[] = data.documents?.[0] || [];
    const metadatas = data.metadatas?.[0] || [];
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

    let filtered = results
      .filter((r) => r.text.length > 0 && r.score < MAX_DISTANCE)
      .sort((a, b) => a.score - b.score);

    if (!filtered.length) {
      console.log("⚠️ Usando fallback sin filtro...");
      filtered = results.sort((a, b) => a.score - b.score);
    }

    const bestChunks = filtered.slice(0, MAX_CHUNKS);

    const context = bestChunks.map((r) => r.text).join("\n\n");

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
