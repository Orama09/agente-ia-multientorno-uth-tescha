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

  // 👇 Montos en pesos: "$602.00 M.N." o "$602" → "602 pesos" / "602 pesos
  // con 50 centavos". Sin esto, el símbolo "$" llega intacto al sintetizador
  // de voz, que lo lee como "dólares" sin importar el idioma configurado —
  // el texto visible en el chat siempre estuvo correcto, el problema era
  // solo en el audio.
  text = text.replace(
    /\$\s?(\d{1,3}(?:,\d{3})*)(?:\.(\d{2}))?\s*(?:M\.?\s?N\.?)?/gi,
    (_m, intPart: string, decPart?: string) => {
      const integer = intPart.replace(/,/g, "");
      const cents = decPart ? parseInt(decPart, 10) : 0;
      const pesosWord = integer === "1" ? "peso" : "pesos";
      if (cents > 0) {
        const centavosWord = cents === 1 ? "centavo" : "centavos";
        return `${integer} ${pesosWord} con ${cents} ${centavosWord}`;
      }
      return `${integer} ${pesosWord}`;
    }
  );

  // Restos de markup sueltos (sin vaciar palabras) — se incluye "$" aquí
  // como red de seguridad, por si algún monto no calzó con el patrón de
  // arriba (formato inesperado), para que al menos no se lea como "dólares".
  text = text.replace(/[#*_`~|\\$]/g, " ");

  text = text.replace(/\s+/g, " ").trim();

  if (text.length < 2) return "";

  const MAX_CHARS = 3500;
  if (text.length > MAX_CHARS) {
    text = `${text.slice(0, MAX_CHARS).trim()}…`;
  }

  return text;
}