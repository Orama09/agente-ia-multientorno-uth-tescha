/**
 * Limpia markdown / ruido para TTS local.
 * Preparado para reutilizarse con otro proveedor TTS en el futuro.
 */
export function sanitizeSpeechText(raw: string): string {
  let text = raw.trim();
  if (!text) return "";

  // No leer mensajes de error técnicos del chat
  if (/error al procesar/i.test(text)) return "";
  if (text.includes("❌")) return "";

  // Bloques de código: omitir contenido largo, dejar marcador breve
  text = text.replace(/```[\s\S]*?```/g, (block) => {
    const inner = block.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
    if (inner.trim().length > 120) {
      return " Bloque de código omitido. ";
    }
    return ` ${inner.trim()} `;
  });

  // Código inline
  text = text.replace(/`([^`]+)`/g, "$1");

  // Enlaces markdown → texto ancla; si el ancla es URL, frase corta
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string) => {
    const t = String(label).trim();
    if (/^https?:\/\//i.test(t) || t.length > 60) {
      return "enlace disponible";
    }
    return t || "enlace disponible";
  });

  // URLs sueltas (evitar leerlas enteras)
  text = text.replace(/https?:\/\/\S+/gi, " enlace disponible ");
  text = text.replace(/\bwww\.\S+/gi, " enlace disponible ");

  // Encabezados
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Negritas / cursivas / tachado
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");

  // Listas y citas
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(/^\s*>\s+/gm, "");

  // Restos de markup sueltos (sin vaciar palabras)
  text = text.replace(/[#*_`~|\\]/g, " ");

  text = text.replace(/\s+/g, " ").trim();

  if (text.length < 2) return "";

  const MAX_CHARS = 3500;
  if (text.length > MAX_CHARS) {
    text = `${text.slice(0, MAX_CHARS).trim()}…`;
  }

  return text;
}
