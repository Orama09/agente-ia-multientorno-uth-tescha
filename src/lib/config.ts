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

/** URL base de Ollama (sin ruta /api). Default local: localhost:11434 */
export const OLLAMA_URL = trimTrailingSlash(
  readEnv("OLLAMA_URL", "http://localhost:11434")
);

/** URL base de ChromaDB (sin /api/v2). Default local: localhost:8000 */
export const CHROMA_URL = trimTrailingSlash(
  readEnv("CHROMA_URL", "http://localhost:8000")
);

/** Default liviano para CPU local; en equipos potentes usa llama3 vía .env */
export const OLLAMA_GENERATION_MODEL = readEnv(
  "OLLAMA_GENERATION_MODEL",
  "llama3.2:1b"
);

export const OLLAMA_EMBEDDING_MODEL = readEnv(
  "OLLAMA_EMBEDDING_MODEL",
  "nomic-embed-text"
);

/** Cuánto tiempo Ollama mantiene el modelo en memoria (p. ej. 30m, -1 = indefinido). */
export const OLLAMA_KEEP_ALIVE = readEnv("OLLAMA_KEEP_ALIVE", "30m");

export const CHROMA_COLLECTION_NAME = readEnv(
  "CHROMA_COLLECTION_NAME",
  "school_documents"
);

/**
 * Umbral de distancia Chroma (L2). Con nomic-embed-text las distancias suelen
 * estar en cientos (~200–300 en logs locales); un valor como 2.0 nunca matcheaba.
 * Ajusta con RAG_MAX_DISTANCE si tu índice usa otra escala.
 */
const parsedRagMaxDistance = Number(readEnv("RAG_MAX_DISTANCE", "280"));
export const RAG_MAX_DISTANCE = Number.isFinite(parsedRagMaxDistance)
  ? parsedRagMaxDistance
  : 280;

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
