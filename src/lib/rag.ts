import {
  CHROMA_COLLECTION_NAME,
  OLLAMA_EMBEDDING_MODEL,
  OLLAMA_KEEP_ALIVE,
  OLLAMA_URL,
  RAG_DISTANCE_MARGIN,
  RAG_MAX_DISTANCE,
  chromaPaths,
} from "./config";
import { elapsedMs, logPerf, nowMs } from "./performanceLog";

/** Máximo de chunks al prompt (menos contexto = menos prefill en Ollama). */
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

async function createEmbedding(
  text: string,
  requestId?: string
): Promise<number[] | null> {
  const startedAt = nowMs();

  if (embeddingCache.has(text)) {
    if (requestId) {
      logPerf("rag", requestId, "embedding", {
        ms: elapsedMs(startedAt),
        cache_hit: true,
        input_chars: text.length,
        model: OLLAMA_EMBEDDING_MODEL,
      });
    }
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
        keep_alive: OLLAMA_KEEP_ALIVE,
      }),
    });

    if (!res.ok) {
      console.error("❌ Error creando embedding: status", res.status);
      if (requestId) {
        logPerf("rag", requestId, "embedding_error", {
          ms: elapsedMs(startedAt),
          cache_hit: false,
          status: res.status,
        });
      }
      return null;
    }

    const data: {
      embedding?: number[];
      data?: Array<{ embedding?: number[] }>;
    } = await res.json();

    const embedding =
      data.embedding || data?.data?.[0]?.embedding || null;

    if (!embedding) {
      if (requestId) {
        logPerf("rag", requestId, "embedding_error", {
          ms: elapsedMs(startedAt),
          cache_hit: false,
          reason: "empty",
        });
      }
      return null;
    }

    const parsed = embedding.map((v) => Number(v));

    if (parsed.length !== 768) {
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

    embeddingCache.set(text, parsed);

    if (requestId) {
      logPerf("rag", requestId, "embedding", {
        ms: elapsedMs(startedAt),
        cache_hit: false,
        input_chars: text.length,
        model: OLLAMA_EMBEDDING_MODEL,
        keep_alive: OLLAMA_KEEP_ALIVE,
      });
    }

    return parsed;
  } catch (error) {
    console.error("❌ Error creando embedding:", error);
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

    // Embedir solo la pregunta: el texto envoltorio sesgaba a chunks genéricos.
    const embedding = await createEmbedding(userQuery.trim(), requestId);
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

    console.log("📊 Distancias:", distances);

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

    // Sin fallback ciego: umbral absoluto + margen respecto al mejor match.
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
        `⚠️ Sin contexto relevante (mejor=${bestDistance.toFixed(1)}, umbral=${RAG_MAX_DISTANCE}); no se usa fallback ciego`
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
