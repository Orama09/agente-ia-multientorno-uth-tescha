import { OLLAMA_GENERATION_MODEL, OLLAMA_URL } from "./config";

// ================================
// Generación sin streaming (fallback)
// ================================
export async function queryModel(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_GENERATION_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama respondió con status ${response.status}`);
  }

  const data = await response.json();
  return data.response || "";
}

// ================================
// Streaming con callback por token
// ================================
export async function streamModelResponse(
  prompt: string,
  onToken: (token: string) => void
): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_GENERATION_MODEL,
      prompt,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama respondió con status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No stream");

  const decoder = new TextDecoder();
  let fullResponse = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const json = JSON.parse(line);
        const token = json.response || "";
        if (token) {
          fullResponse += token;
          onToken(token);
        }
      } catch {
        // Línea JSON incompleta; Ollama envía un JSON por línea
      }
    }
  }

  return fullResponse;
}
