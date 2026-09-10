/**
 * Configuración centralizada de servicios externos.
 * Lee variables de entorno con valores por defecto para desarrollo local.
 * En Docker, docker-compose inyecta las URLs de los servicios internos.
 */

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function readEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : defaultValue;
}

/** URL base de ChromaDB (sin /api/v2). Default local: localhost:8000 */
export const CHROMA_URL = trimTrailingSlash(
  readEnv("CHROMA_URL", "http://localhost:8000")
);

export const CHROMA_COLLECTION_NAME = readEnv(
  "CHROMA_COLLECTION_NAME",
  "school_documents"
);

/**
 * Umbral de distancia Chroma (L2).
 *
 * 👇 RECALIBRADO: el proyecto migró de Ollama/nomic-embed-text (distancias
 * ~200–300) a Gemini (gemini-embedding-001), cuyos vectores se normalizan
 * manualmente en rag.ts. Con vectores normalizados, la distancia L2 entre
 * dos embeddings va de 0 a 2 — los valores viejos (260/18) nunca filtraban
 * nada en esta escala nueva porque ningún resultado real la supera.
 *
 * Valores observados en producción con Gemini: coincidencias relevantes
 * ~0.45–0.65. Se bajó de 0.9 a 0.8 para interceptar preguntas ajenas al
 * TESCHA (ej. jerga de internet) ANTES de llamar a Gemini — cuando
 * no_relevant_context es true, route.ts responde directo con
 * getNoContextReply() de institutionalReplies.ts, igual que un saludo,
 * sin gastar una llamada al modelo.
 *
 * ⚠️ TRADE-OFF: se observó al menos una pregunta legítima con
 * best_distance=0.81 — un umbral de 0.8 la dejaría fuera. Si notas que
 * preguntas válidas empiezan a responder "no dispongo del dato", sube este
 * valor (ej. 0.85 o 0.9) vía la variable de entorno RAG_MAX_DISTANCE en tu
 * .env o docker-compose.yml, sin necesidad de tocar el código. Ajusta
 * mirando la línea "📊 Distancias ChromaDB" de tus logs para encontrar el
 * punto donde las preguntas relevantes y las irrelevantes se separan mejor
 * en tu caso real.
 */
const parsedRagMaxDistance = Number(readEnv("RAG_MAX_DISTANCE", "0.8"));
export const RAG_MAX_DISTANCE = Number.isFinite(parsedRagMaxDistance)
  ? parsedRagMaxDistance
  : 0.8;

/** Solo se aceptan chunks cercanos al mejor resultado (evita mezclar temas). */
const parsedRagDistanceMargin = Number(readEnv("RAG_DISTANCE_MARGIN", "0.15"));
export const RAG_DISTANCE_MARGIN = Number.isFinite(parsedRagDistanceMargin)
  ? parsedRagDistanceMargin
  : 0.15;

/** Base URL de la API v2 de ChromaDB */
export function getChromaApiUrl(): string {
  return `${CHROMA_URL}/api/v2`;
}

/** Rutas comunes de la API Chroma v2 */
export const chromaPaths = {
  collections: () =>
    `${getChromaApiUrl()}/tenants/default_tenant/databases/default_database/collections`,
  collection: (collectionId: string) =>
    `${getChromaApiUrl()}/tenants/default_tenant/databases/default_database/collections/${collectionId}`,
} as const;