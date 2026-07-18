/**
 * Extracción de frases completas para TTS progresivo durante streaming.
 * Delimitadores: . ? ! salto de línea; ":" solo si la frase es larga.
 */

const MIN_SENTENCE_CHARS = 12;
const MIN_COLON_PHRASE_CHARS = 40;

const SHORT_GREETING =
  /^(hola|buenas|buen día|buenos días|buenas tardes|buenas noches|qué tal|que tal|hey|hi|hello)\b/i;

export function shouldSpeakSentence(raw: string): boolean {
  const text = raw.trim();
  if (!text) return false;
  if (text.length >= MIN_SENTENCE_CHARS) return true;
  if (SHORT_GREETING.test(text)) return true;
  // Respuestas cortas completas: "Sí.", "Ok.", "No."
  if (text.length >= 2 && /[.!?…]$/.test(text)) return true;
  return false;
}

/**
 * Parte el buffer en frases cerradas + remanente incompleto.
 * No modifica el texto (la sanitización ocurre al encolar).
 */
export function extractCompleteSentences(buffer: string): {
  complete: string[];
  remainder: string;
} {
  const complete: string[] = [];
  let start = 0;
  let i = 0;

  while (i < buffer.length) {
    const ch = buffer[i];

    if (ch === "\n" || ch === "\r") {
      const piece = buffer.slice(start, i).trim();
      if (piece) complete.push(piece);
      while (i < buffer.length && (buffer[i] === "\n" || buffer[i] === "\r")) {
        i += 1;
      }
      start = i;
      continue;
    }

    if (ch === "." || ch === "?" || ch === "!") {
      const end = i + 1;
      let j = end;
      while (j < buffer.length && /\s/.test(buffer[j]!)) j += 1;
      const piece = buffer.slice(start, end).trim();
      if (piece) complete.push(piece);
      start = j;
      i = j;
      continue;
    }

    if (ch === ":") {
      const piece = buffer.slice(start, i + 1).trim();
      if (piece.length >= MIN_COLON_PHRASE_CHARS) {
        let j = i + 1;
        while (j < buffer.length && /\s/.test(buffer[j]!)) j += 1;
        complete.push(piece);
        start = j;
        i = j;
        continue;
      }
    }

    i += 1;
  }

  return {
    complete,
    remainder: buffer.slice(start),
  };
}

export function logSpeechStream(
  event: string,
  data?: Record<string, string | number | boolean>,
): void {
  if (process.env.NODE_ENV !== "development") return;
  const prefix = `[speech:stream] ${event}`;
  if (!data) {
    console.log(prefix);
    return;
  }
  const parts = Object.entries(data)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(" ");
  console.log(`${prefix} ${parts}`);
}
