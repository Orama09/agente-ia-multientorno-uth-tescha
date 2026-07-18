import {
  OLLAMA_GENERATION_MODEL,
  OLLAMA_KEEP_ALIVE,
  OLLAMA_URL,
} from "./config";
import { elapsedMs, logPerf, nowMs } from "./performanceLog";

export type StreamModelOptions = {
  requestId?: string;
};

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
      keep_alive: OLLAMA_KEEP_ALIVE,
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
  onToken: (token: string) => void,
  options?: StreamModelOptions
): Promise<string> {
  const requestId = options?.requestId;
  const startedAt = nowMs();
  let firstTokenAt: number | null = null;
  let tokenEvents = 0;

  if (requestId) {
    logPerf("ollama", requestId, "generate_start", {
      model: OLLAMA_GENERATION_MODEL,
      ollama_url: OLLAMA_URL,
      prompt_chars: prompt.length,
      keep_alive: OLLAMA_KEEP_ALIVE,
    });
  }

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_GENERATION_MODEL,
      prompt,
      stream: true,
      keep_alive: OLLAMA_KEEP_ALIVE,
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
          if (firstTokenAt === null) {
            firstTokenAt = nowMs();
            if (requestId) {
              logPerf("ollama", requestId, "first_token", {
                ttft_ms: elapsedMs(startedAt),
                model: OLLAMA_GENERATION_MODEL,
                keep_alive: OLLAMA_KEEP_ALIVE,
              });
            }
          }

          tokenEvents += 1;
          fullResponse += token;
          onToken(token);
        }
      } catch {
        // Línea JSON incompleta; Ollama envía un JSON por línea
      }
    }
  }

  if (requestId) {
    logPerf("ollama", requestId, "generate_end", {
      total_ms: elapsedMs(startedAt),
      ttft_ms: firstTokenAt !== null ? Math.round(firstTokenAt - startedAt) : -1,
      token_events: tokenEvents,
      response_chars: fullResponse.length,
      model: OLLAMA_GENERATION_MODEL,
      ollama_url: OLLAMA_URL,
      keep_alive: OLLAMA_KEEP_ALIVE,
    });
  }

  return fullResponse;
}
