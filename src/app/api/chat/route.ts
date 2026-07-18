import { retrieveContext, addToRAG } from "@/lib/rag";
import { streamModelResponse } from "@/lib/ollama";
import {
  createRequestId,
  elapsedMs,
  logPerf,
  nowMs,
} from "@/lib/performanceLog";
import pdf from "pdf-parse";

/** Tope de contexto RAG en el prompt (prefill más corto en Ollama). */
const MAX_CONTEXT_CHARS = 2500;

/** Últimas N líneas de memoria (Usuario/Asistente) enviadas al prompt. */
const MAX_HISTORY_LINES = 4;

/** Tope duro de caracteres de historial en el prompt. */
const MAX_HISTORY_CHARS = 1400;

/** Cuántas entradas guardar en memoria del servidor (no todas van al prompt). */
const MAX_MEMORY_LINES = 20;

const memory = new Map<string, string[]>();

function buildHistoryForPrompt(history: string[]): {
  text: string;
  history_truncated: boolean;
  history_lines_used: number;
} {
  const recent = history.slice(-MAX_HISTORY_LINES);
  let text = recent.join("\n");
  let history_truncated = recent.length < history.length;

  if (text.length > MAX_HISTORY_CHARS) {
    text = text.slice(-MAX_HISTORY_CHARS);
    history_truncated = true;
  }

  return {
    text,
    history_truncated,
    history_lines_used: recent.length,
  };
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type");

    if (contentType?.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return Response.json({ error: "No se recibió archivo" }, { status: 400 });
      }

      let text = "";

      if (file.type === "application/pdf") {
        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await pdf(buffer);
        text = data.text;
      } else {
        text = await file.text();
      }

      await addToRAG(text, file.name);

      return Response.json({
        response: "Documento procesado correctamente. Ya puedes hacer preguntas.",
      });
    }

    const requestId = createRequestId();
    const requestStartedAt = nowMs();

    const body = await req.json();
    const question = body.question || body.message;
    const userId = body.userId || "default";

    if (!question) {
      return Response.json({ error: "Pregunta inválida" }, { status: 400 });
    }

    logPerf("chat", requestId, "request_start", {
      question_chars: String(question).length,
      history_turns: memory.get(userId)?.length ?? 0,
    });

    if (!memory.has(userId)) {
      memory.set(userId, []);
    }

    const userHistory = memory.get(userId)!;
    const {
      text: historyText,
      history_truncated,
      history_lines_used,
    } = buildHistoryForPrompt(userHistory);

    const ragStartedAt = nowMs();
    logPerf("chat", requestId, "retrieve_start");
    const { context } = await retrieveContext(question, 6, requestId);
    logPerf("chat", requestId, "retrieve_end", {
      ms: elapsedMs(ragStartedAt),
      context_chars: context.length,
      no_relevant_context: !context || context.trim().length === 0,
    });

    let finalContext = context;

    if (!finalContext || finalContext.trim().length < 20) {
      finalContext = "Información limitada disponible.";
    }

    const truncatedContext =
      finalContext.length > MAX_CONTEXT_CHARS
        ? finalContext.slice(0, MAX_CONTEXT_CHARS)
        : finalContext;

    const promptStartedAt = nowMs();
    const prompt = `
Eres un asistente inteligente del TESCHA.

Tu objetivo es ayudar al usuario con respuestas claras, útiles y naturales.

Reglas:
- Usa el contexto como base principal
- Puedes explicar, resumir o adaptar
- Si no hay suficiente info, responde de forma útil sin inventar
- NO digas que eres un modelo
- NO menciones "contexto" ni "documentos"

Contexto:
${truncatedContext}

Conversación previa:
${historyText}

Usuario:
${question}

Asistente:
`;

    logPerf("chat", requestId, "prompt_built", {
      ms: elapsedMs(promptStartedAt),
      prompt_chars: prompt.length,
      context_chars: truncatedContext.length,
      history_chars: historyText.length,
      history_lines_used,
      history_truncated,
      context_truncated: finalContext.length > MAX_CONTEXT_CHARS,
      no_relevant_context: !context || context.trim().length === 0,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let firstTokenLogged = false;
        const streamStartedAt = nowMs();

        try {
          logPerf("chat", requestId, "stream_start", {
            ms_since_request: elapsedMs(requestStartedAt),
          });

          const fullResponse = await streamModelResponse(
            prompt,
            (token) => {
              if (!firstTokenLogged) {
                firstTokenLogged = true;
                logPerf("chat", requestId, "first_token", {
                  ms_since_request: elapsedMs(requestStartedAt),
                  ms_since_stream_start: elapsedMs(streamStartedAt),
                });
              }
              controller.enqueue(encoder.encode(token));
            },
            { requestId }
          );

          userHistory.push(`Usuario: ${question}`);
          userHistory.push(`Asistente: ${fullResponse}`);

          if (userHistory.length > MAX_MEMORY_LINES) {
            memory.set(userId, userHistory.slice(-MAX_MEMORY_LINES));
          }

          logPerf("chat", requestId, "stream_end", {
            ms_since_stream_start: elapsedMs(streamStartedAt),
            response_chars: fullResponse.length,
          });

          logPerf("chat", requestId, "request_end", {
            total_ms: elapsedMs(requestStartedAt),
          });

          controller.close();
        } catch (err) {
          console.error(err);
          logPerf("chat", requestId, "request_error", {
            total_ms: elapsedMs(requestStartedAt),
          });
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
