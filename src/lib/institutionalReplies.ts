/**
 * Respuestas institucionales fijas (portal TESCHA).
 * Evita que llama3.2:1b invente texto cuando RAG no encuentra chunks.
 * Los hechos salen de las páginas del portal (inicio, avisos, oferta académica).
 */

const GREETING =
  /^(hola|buenas|buen[oa]s?\s+(d[ií]as|tardes|noches)|qu[eé] tal|hey|hi|hello|saludos)[\s!.,?¿¡]*$/i;

const CONVOCATORIA =
  /convocator|admisi[oó]n|inscripci[oó]n|inscribir|examen de admisi[oó]n|fechas?/i;

const ABOUT =
  /tescha|universidad|tecnol[oó]gic|instituci[oó]n|qui[eé]n eres|qu[eé] (eres|haces|sabes)|qu[eé] es lo que sabes|acerca/i;

const OFERTA =
  /oferta acad[eé]mica|carreras?|ingenier[ií]as?|programas acad[eé]micos/i;

export const GREETING_REPLY =
  "¡Hola! Soy el asistente virtual del TESCHA. ¿En qué te puedo ayudar? Puedo orientarte sobre la institución, oferta académica, estudiantes, avisos y la convocatoria de admisión 2026.";

export const CONVOCATORIA_REPLY =
  "La convocatoria oficial de admisión 2026 ya está disponible en este portal: usa el botón «Ver convocatoria» para abrir el PDF. Ahí están requisitos, fechas y documentación oficial. Un aviso institucional indica que las inscripciones al nuevo ciclo comienzan en agosto. Las fechas detalladas día por día están en esa convocatoria.";

export const ABOUT_REPLY =
  "El TESCHA (Tecnológico de Estudios Superiores de Chalco) es una institución de educación pública. Ofrece formación en ingeniería, con enfoque en desarrollo profesional, innovación tecnológica y vinculación con el sector productivo. En este portal puedes consultar Oferta Académica, Estudiantes, Acerca del TESCHA y la convocatoria de admisión 2026.";

export const OFERTA_REPLY =
  "La oferta académica del TESCHA incluye: Ingeniería Industrial, Ingeniería en Sistemas, Ingeniería Informática, Ingeniería Electromecánica, Ingeniería en Administración e Ingeniería Electrónica. Puedes ver cada programa en la sección Oferta Académica de este portal.";

export const FALLBACK_REPLY =
  "No encontré un documento específico para esa pregunta. Puedo orientarte con lo que está en este portal: el TESCHA es el Tecnológico de Estudios Superiores de Chalco; hay oferta de ingenierías, avisos institucionales y la convocatoria de admisión 2026 (botón «Ver convocatoria»). Si buscas un trámite concreto, revisa Estudiantes o Servicios escolares.";

export function isGreetingQuery(question: string): boolean {
  return GREETING.test(question.trim());
}

export function isConvocatoriaQuery(question: string): boolean {
  return CONVOCATORIA.test(question.trim());
}

/** Respuesta fija si la pregunta encaja con el portal (sin Ollama). */
export function getCannedReply(question: string): string | null {
  const text = question.trim();
  if (!text) return null;
  if (isGreetingQuery(text)) return GREETING_REPLY;
  if (isConvocatoriaQuery(text)) return CONVOCATORIA_REPLY;
  if (OFERTA.test(text)) return OFERTA_REPLY;
  if (ABOUT.test(text)) return ABOUT_REPLY;
  return null;
}

/** Cuando RAG no trae chunks: no dejar que el modelo de 1B improvise. */
export function getNoContextReply(): string {
  return FALLBACK_REPLY;
}
