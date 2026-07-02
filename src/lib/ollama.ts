// ================================
// 🤖 GENERACIÓN NORMAL (fallback)
// ================================
export async function queryModel(prompt: string) {
  const response = await fetch("http://ollama:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3",
      prompt,
      stream: false,
    }),
  });

  const data = await response.json();

  return data.response || "";
}

// ================================
// 🚀 STREAMING REAL (CLAVE)
// ================================
export async function queryModelStream(
  prompt: string,
  onChunk: (chunk: string) => void
) {
  const response = await fetch("http://ollama:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3",
      prompt,
      stream: true, // 🔥 ACTIVADO
    }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error("No stream");

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Ollama manda JSON por partes
    const parts = buffer.split("\n");

    for (let i = 0; i < parts.length - 1; i++) {
      try {
        const json = JSON.parse(parts[i]);
        if (json.response) {
          onChunk(json.response);
        }
      } catch {}
    }

    buffer = parts[parts.length - 1];
  }
}