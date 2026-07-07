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

export const OLLAMA_GENERATION_MODEL = readEnv(
  "OLLAMA_GENERATION_MODEL",
  "llama3"
);

export const OLLAMA_EMBEDDING_MODEL = readEnv(
  "OLLAMA_EMBEDDING_MODEL",
  "nomic-embed-text"
);

export const CHROMA_COLLECTION_NAME = readEnv(
  "CHROMA_COLLECTION_NAME",
  "school_documents"
);

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
