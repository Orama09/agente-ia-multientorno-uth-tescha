import { GoogleGenAI } from "@google/genai";
import {
  CHROMA_COLLECTION_NAME,
  RAG_DISTANCE_MARGIN,
  RAG_MAX_DISTANCE,
  chromaPaths,
} from "./config";
import { elapsedMs, logPerf, nowMs } from "./performanceLog";

// Inicialización de Google Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
});

// 👇 "text-embedding-004" fue descontinuado por Google (404 NOT_FOUND).
// Modelo vigente: "gemini-embedding-001". Genera 3072 dims por defecto,
// pero se trunca a 768 (EMBEDDING_DIMENSIONS) para mantener compatibilidad
// con el resto del pipeline (indexDocuments.ts usa la misma dimensión).
const EMBEDDING_MODEL_NAME = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS: number = 768;

/** Máximo de chunks al prompt (menos contexto = menos prefill). */
const MAX_CHUNKS = 3;

const TRIVIAL_QUERY =
  /^(hola|buenas|buen[oa]s?\s+(d[ií]as|tardes|noches)|qu[eé] tal|hey|hi|hello|saludos)[\s!.,?¿¡]*$/i;

function isTrivialQuery(query: string): boolean {
  const text = query.trim();
  if (!text) return true;
  return TRIVIAL_QUERY.test(text);
}

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

// 👇 Cache del ID de colección: rara vez cambia (solo si se recrea o
// renombra la colección), así que evitamos pedirle a Chroma la lista
// completa de colecciones en cada mensaje del chat.
let cachedCollectionId: string | null = null;

async function getCollectionId(): Promise<string> {
  if (cachedCollectionId) return cachedCollectionId;

  const res = await fetch(chromaPaths.collections());

  if (!res.ok) {
    throw new Error(`Chroma respondió con status ${res.status}`);
  }

  const data: Array<{ id: string; name: string }> = await res.json();

  const collection = data.find((c) => c.name === CHROMA_COLLECTION_NAME);

  if (!collection) {
    throw new Error("Colección no encontrada");
  }

  cachedCollectionId = collection.id;
  return collection.id;
}

/**
 * Normaliza un vector a norma 1 (magnitud 1). Necesario manualmente
 * porque gemini-embedding-001 NO normaliza automáticamente los
 * vectores truncados (dimensiones distintas de 3072).
 */
function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

/**
 * Genera el embedding usando Google Gemini (gemini-embedding-001).
 * Trunca a EMBEDDING_DIMENSIONS (768) y normaliza manualmente.
 *
 * @param taskType - "RETRIEVAL_DOCUMENT" para texto que se va a indexar
 *                    (addToRAG), "RETRIEVAL_QUERY" para la pregunta del
 *                    usuario (retrieveContext). Usar el tipo correcto en
 *                    cada caso mejora la calidad de la búsqueda semántica.
 */
async function createEmbedding(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
  requestId?: string
): Promise<number[] | null> {
  const startedAt = nowMs();

  // Nota: el cache se comparte entre queries y documentos. Si algún día
  // el mismo texto exacto se usara con los dos task types, esto podría
  // devolver el embedding del tipo equivocado. En la práctica no pasa
  // (las preguntas del usuario casi nunca coinciden con un chunk
  // indexado carácter por carácter), pero queda documentado.
  if (embeddingCache.has(text)) {
    if (requestId) {
      logPerf("rag", requestId, "embedding", {
        ms: elapsedMs(startedAt),
        cache_hit: true,
        input_chars: text.length,
        model: EMBEDDING_MODEL_NAME,
      });
    }
    return embeddingCache.get(text)!;
  }

  try {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL_NAME,
      contents: text,
      config: {
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    });
    const rawEmbedding = response.embeddings?.[0]?.values;

    if (!rawEmbedding || rawEmbedding.length === 0) {
      if (requestId) {
        logPerf("rag", requestId, "embedding_error", {
          ms: elapsedMs(startedAt),
          cache_hit: false,
          reason: "empty",
        });
      }
      return null;
    }

    let parsed = Array.from(rawEmbedding).map((v) => Number(v));

    if (parsed.length !== EMBEDDING_DIMENSIONS) {
      console.log("⚠️ Dimensión incorrecta:", parsed.length);
      if (requestId) {
        logPerf("rag", requestId, "embedding_error", {
          ms: elapsedMs(startedAt),
          cache_hit: false,
          reason: "bad_dims",
          dims: parsed.length,
        });
      }
      return null;
    }

    // Normalización manual requerida para dimensiones truncadas
    if (EMBEDDING_DIMENSIONS !== 3072) {
      parsed = normalizeVector(parsed);
    }

    embeddingCache.set(text, parsed);

    if (requestId) {
      logPerf("rag", requestId, "embedding", {
        ms: elapsedMs(startedAt),
        cache_hit: false,
        input_chars: text.length,
        model: EMBEDDING_MODEL_NAME,
      });
    }

    return parsed;
  } catch (error) {
    console.error("❌ Error creando embedding con Gemini:", error);
    if (requestId) {
      logPerf("rag", requestId, "embedding_error", {
        ms: elapsedMs(startedAt),
        cache_hit: false,
        reason: "exception",
      });
    }
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

      // Texto que se va a poder encontrar → RETRIEVAL_DOCUMENT
      const embedding = await createEmbedding(chunk, "RETRIEVAL_DOCUMENT");
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

    console.log(`✅ Chunks indexados con Gemini: ${inserted}/${chunks.length}`);
  } catch (error) {
    console.error("❌ Error agregando al RAG:", error);
  }
}

export async function retrieveContext(
  userQuery: string,
  _topK = 6,
  requestId?: string
): Promise<RetrieveResult> {
  const ragStartedAt = nowMs();

  try {
    if (requestId) {
      logPerf("rag", requestId, "retrieve_start", {
        query_chars: userQuery.length,
      });
    }

    if (isTrivialQuery(userQuery)) {
      if (requestId) {
        logPerf("rag", requestId, "retrieve_end", {
          total_ms: elapsedMs(ragStartedAt),
          results: 0,
          chunks_used: 0,
          context_chars: 0,
          used_fallback: false,
          no_relevant_context: true,
          skipped_greeting: true,
        });
      }
      return { context: "", sources: [] };
    }

    const collectionStartedAt = nowMs();
    const collectionId = await getCollectionId();
    if (requestId) {
      logPerf("rag", requestId, "get_collection_id", {
        ms: elapsedMs(collectionStartedAt),
      });
    }

    // Pregunta del usuario → RETRIEVAL_QUERY (task type distinto al de
    // los documentos indexados; así Gemini optimiza cada vector para su rol)
    const embedding = await createEmbedding(
      userQuery.trim(),
      "RETRIEVAL_QUERY",
      requestId
    );
    if (!embedding) {
      if (requestId) {
        logPerf("rag", requestId, "retrieve_end", {
          total_ms: elapsedMs(ragStartedAt),
          results: 0,
          chunks_used: 0,
          context_chars: 0,
          used_fallback: false,
          no_relevant_context: true,
          reason: "no_embedding",
        });
      }
      return { context: "", sources: [] };
    }

    const chromaStartedAt = nowMs();
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

    if (requestId) {
      logPerf("rag", requestId, "chroma_query", {
        ms: elapsedMs(chromaStartedAt),
        status: chromaRes.status,
      });
    }

    if (!chromaRes.ok) {
      console.error("❌ Error RAG: Chroma status", chromaRes.status);
      if (requestId) {
        logPerf("rag", requestId, "retrieve_end", {
          total_ms: elapsedMs(ragStartedAt),
          results: 0,
          chunks_used: 0,
          context_chars: 0,
          used_fallback: false,
          no_relevant_context: true,
          reason: "chroma_error",
        });
      }
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

    console.log("📊 Distancias ChromaDB:", distances);

    if (!documents.length) {
      if (requestId) {
        logPerf("rag", requestId, "retrieve_end", {
          total_ms: elapsedMs(ragStartedAt),
          results: 0,
          chunks_used: 0,
          context_chars: 0,
          used_fallback: false,
          no_relevant_context: true,
          reason: "no_documents",
        });
      }
      return { context: "", sources: [] };
    }

    const results = documents.map((doc, i) => ({
      text: doc?.trim() || "",
      source: metadatas[i]?.source || "Documento",
      score: distances[i] ?? 999,
    }));

    const ranked = results
      .filter((r) => r.text.length > 0)
      .sort((a, b) => a.score - b.score);

    const bestDistance = ranked[0]?.score ?? 999;
    const filtered = ranked.filter(
      (r) =>
        r.score < RAG_MAX_DISTANCE &&
        r.score <= bestDistance + RAG_DISTANCE_MARGIN
    );

    if (!filtered.length) {
      console.log(
        `⚠️ Sin contexto relevante (mejor=${bestDistance.toFixed(1)}, umbral=${RAG_MAX_DISTANCE})`
      );
      if (requestId) {
        logPerf("rag", requestId, "retrieve_end", {
          total_ms: elapsedMs(ragStartedAt),
          results: results.length,
          chunks_used: 0,
          context_chars: 0,
          used_fallback: false,
          no_relevant_context: true,
          max_distance: RAG_MAX_DISTANCE,
          distance_margin: RAG_DISTANCE_MARGIN,
          best_distance: Number(bestDistance.toFixed(2)),
        });
      }
      return { context: "", sources: [] };
    }

    const bestChunks = filtered.slice(0, MAX_CHUNKS);

    const context = bestChunks.map((r) => r.text).join("\n\n");

    const sources: SourceItem[] = bestChunks.map((r, i) => ({
      id: i + 1,
      source: r.source,
      preview: r.text.slice(0, 120) + "...",
    }));

    if (requestId) {
      logPerf("rag", requestId, "retrieve_end", {
        total_ms: elapsedMs(ragStartedAt),
        results: results.length,
        chunks_used: bestChunks.length,
        context_chars: context.length,
        used_fallback: false,
        no_relevant_context: false,
        max_distance: RAG_MAX_DISTANCE,
        distance_margin: RAG_DISTANCE_MARGIN,
        best_distance: Number(bestDistance.toFixed(2)),
        sources: bestChunks.map((c) => c.source).join(","),
      });
    }

    return { context, sources };
  } catch (error) {
    console.error("❌ Error RAG:", error);
    if (requestId) {
      logPerf("rag", requestId, "retrieve_end", {
        total_ms: elapsedMs(ragStartedAt),
        results: 0,
        chunks_used: 0,
        context_chars: 0,
        used_fallback: false,
        no_relevant_context: true,
        reason: "exception",
      });
    }
    return { context: "", sources: [] };
  }
}