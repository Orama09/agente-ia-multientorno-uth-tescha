/**
 * Respuestas institucionales fijas (portal TESCHA).
 * Evita que llama3.2:1b invente texto cuando RAG no encuentra chunks.
 * Los hechos salen de la página de inicio (avisos / convocatoria 2026).
 */

const GREETING =
  /^(hola|buenas|buen[oa]s?\s+(d[ií]as|tardes|noches)|qu[eé] tal|hey|hi|hello|saludos)[\s!.,?¿¡]*$/i;

const CONVOCATORIA =
  /convocator|admisi[oó]n|inscripci[oó]n|inscribir|examen de admisi[oó]n|fechas?/i;

export const GREETING_REPLY =
  "¡Hola! Soy el asistente virtual del TESCHA. ¿En qué te puedo ayudar? Puedo orientarte sobre oferta académica, estudiantes, avisos y la convocatoria de admisión 2026.";

export const CONVOCATORIA_REPLY =
  "La convocatoria oficial de admisión 2026 ya está disponible en este portal: usa el botón «Ver convocatoria» para abrir el PDF. Ahí están requisitos, fechas y documentación oficial. Un aviso institucional indica que las inscripciones al nuevo ciclo comienzan en agosto. No invento un calendario día por día; las fechas detalladas están en esa convocatoria.";

export function isGreetingQuery(question: string): boolean {
  return GREETING.test(question.trim());
}

export function isConvocatoriaQuery(question: string): boolean {
  return CONVOCATORIA.test(question.trim());
}

/** Si hay respuesta fija, no se llama a Ollama. */
export function getCannedReply(question: string): string | null {
  const text = question.trim();
  if (!text) return null;
  if (isGreetingQuery(text)) return GREETING_REPLY;
  if (isConvocatoriaQuery(text)) return CONVOCATORIA_REPLY;
  return null;
}
