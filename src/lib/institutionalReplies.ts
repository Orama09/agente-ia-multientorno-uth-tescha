/**
 * Respuestas institucionales fijas (portal TESCHA).
 * Evita que el lenguaje de inteligencia artificial invente texto cuando RAG no encuentra chunks.
 * Los hechos salen de las páginas del portal (inicio, avisos, oferta académica).
 */

const GREETING =
  /^(hola|buenas|buen[oa]s?\s+(d[ií]as|tardes|noches)|qu[eé] tal|hey|hi|hello|saludos)[\s!.,?¿¡]*$/i;

export const GREETING_REPLY =
  "¡Hola! Soy el asistente virtual del TESCHA. ¿En qué te puedo ayudar? Puedo orientarte sobre la institución, oferta académica, estudiantes, trámites y la convocatoria de admisión 2026.";

export const FALLBACK_REPLY =
  "No encontré ese tipo de información. Te sugiero preguntar información relacionada a la institución (Oferta Académica, Estudiantes, Servicios Escolares) o la convocatoria 2026.";

export function isGreetingQuery(question: string): boolean {
  return GREETING.test(question.trim());
}

/** Solo intercepta saludos directos para evitar saltarse la base de datos u Ollama */
export function getCannedReply(question: string): string | null {
  const text = question.trim();
  if (!text) return null;
  if (isGreetingQuery(text)) return GREETING_REPLY;
  return null;
}

export function getNoContextReply(): string {
  return FALLBACK_REPLY;
}