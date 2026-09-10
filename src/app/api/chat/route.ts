import { retrieveContext, addToRAG } from "@/lib/rag";
import { getCannedReply, getNoContextReply } from "@/lib/institutionalReplies";
import {
  createRequestId,
  elapsedMs,
  logPerf,
  nowMs,
} from "@/lib/performanceLog";
import pdf from "pdf-parse";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// Inicialización de la API de Google Gemini con la SDK oficial @google/genai
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
});

// 👇 "gemini-1.5-flash" fue descontinuado por Google (404 NOT_FOUND).
// "gemini-2.5-flash" también dejó de estar disponible para nuevos usuarios.
// Google recomienda ahora "gemini-3.6-flash" (GA, mejor eficiencia y
// planificación agéntica) como el modelo Flash vigente.
const CHAT_MODEL = "gemini-3.6-flash";

/** Detecta si un error de la API de Gemini es por sobrecarga temporal (503) o cuota agotada (429). */
function isRetryableError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 503 || status === 429) return true;
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('"code":503') ||
    message.includes("UNAVAILABLE") ||
    message.includes('"code":429') ||
    message.includes("RESOURCE_EXHAUSTED")
  );
}

/** true solo para 429 (cuota) — usado para dar un mensaje más preciso al usuario. */
function isQuotaError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 429) return true;
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('"code":429') || message.includes("RESOURCE_EXHAUSTED");
}

/**
 * Extrae el retryDelay sugerido por la propia API de Gemini (ej. "1.16s",
 * "28s") del cuerpo del error 429. Si no se encuentra, usa un valor por
 * defecto. Se limita a un máximo para no hacer esperar demasiado al usuario.
 */
function extractRetryDelayMs(err: unknown, fallbackMs: number, maxMs: number): number {
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/);
  if (!match) return fallbackMs;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds)) return fallbackMs;
  return Math.min(Math.ceil(seconds * 1000) + 200, maxMs);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Llama a Gemini con un reintento automático ante sobrecarga temporal (503)
 * o cuota agotada (429). Para 429, espera el tiempo que la propia API
 * sugiere en "retryDelay" en vez de un valor fijo.
 */
async function generateWithRetry(
  prompt: string,
  requestId: string
): Promise<Awaited<ReturnType<typeof ai.models.generateContentStream>>> {
  try {
    return await ai.models.generateContentStream({
      model: CHAT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.0,
        topP: 0.1,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
        maxOutputTokens: 800,
      },
    });
  } catch (err) {
    if (!isRetryableError(err)) throw err;

    // Tope de 8s de espera — más que eso, mejor mostrar el mensaje de
    // fallback que dejar al usuario esperando indefinidamente.
    const delayMs = extractRetryDelayMs(err, 1500, 8000);

    logPerf("chat", requestId, "retry", {
      attempt: 1,
      reason: isQuotaError(err) ? "quota_429" : "overload_503",
      delay_ms: delayMs,
    });

    await wait(delayMs);

    return await ai.models.generateContentStream({
      model: CHAT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.0,
        topP: 0.1,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
        maxOutputTokens: 800,
      },
    });
  }
}
const MAX_CONTEXT_CHARS = 1800;

/** Últimas N líneas de memoria (Usuario/Asistente) enviadas al prompt. */
const MAX_HISTORY_LINES = 4;

/** Tope duro de caracteres de historial en el prompt. */
const MAX_HISTORY_CHARS = 1400;

/** Cuántas entradas guardar en memoria del servidor (no todas van al prompt). */
const MAX_MEMORY_LINES = 20;

const memory = new Map<string, string[]>();

function respondPlain(
  text: string,
  requestId: string,
  requestStartedAt: number,
  userHistory: string[],
  userId: string,
  question: string,
  reason: string
): Response {
  logPerf("chat", requestId, "canned_reply", {
    chars: text.length,
    canned_reply: true,
    reason,
  });

  userHistory.push(`Usuario: ${question}`);
  userHistory.push(`Asistente: ${text}`);
  if (userHistory.length > MAX_MEMORY_LINES) {
    memory.set(userId, userHistory.slice(-MAX_MEMORY_LINES));
  }

  logPerf("chat", requestId, "request_end", {
    total_ms: elapsedMs(requestStartedAt),
  });

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

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

    // Solo saluda en frases de saludo puras (ej. "hola")
    const canned = getCannedReply(String(question));
    if (canned) {
      return respondPlain(
        canned,
        requestId,
        requestStartedAt,
        userHistory,
        userId,
        question,
        "greeting_match"
      );
    }

    // Consulta RAG optimizada
    const ragStartedAt = nowMs();
    logPerf("chat", requestId, "retrieve_start");
    const { context } = await retrieveContext(question, 3, requestId);
    logPerf("chat", requestId, "retrieve_end", {
      ms: elapsedMs(ragStartedAt),
      context_chars: context.length,
      no_relevant_context: !context || context.trim().length === 0,
    });

    const truncatedContext =
      context && context.trim().length > 0
        ? context.slice(0, MAX_CONTEXT_CHARS)
        : "No se recuperaron fragmentos específicos de documentos subidos para esta pregunta.";

    // Sin contexto relevante en los documentos indexados → respuesta
    // institucional fija, sin gastar una llamada al modelo (evita además
    // el riesgo de que el LLM invente algo fuera de tema, ej. medicamentos).
    const noRelevantContext = !context || context.trim().length === 0;
    if (noRelevantContext) {
      return respondPlain(
        getNoContextReply(),
        requestId,
        requestStartedAt,
        userHistory,
        userId,
        question,
        "no_relevant_context"
      );
    }

    const promptStartedAt = nowMs();
    const prompt = `
Eres la IA oficial de asistencia del TESCHA (Tecnológico de Estudios Superiores de Chalco), ubicado en Carretera Federal México-Cuautla s/n, La Candelaria Tlapala, Chalco, Estado de México.

Estructura del portal web:
- Sección "Inicio": Accesos rapidos, Avisos institucionales de nuevo ingreso y botón de consulta de la "Convocatoria de Admisión 2026" (donde se especifican costos de ficha, fechas de examen y proceso de admisión).
- Sección "Acerca del TESCHA": Antecedentes, Objetivo, Misión, Visión e información de contacto la institución, asi como también la Ubicación.
- Sección "Estudiantes": Descarga de formatos oficiales, solicitudes de trámite, proceso de inscripción/reinscripción, servicio social, titulación y servicios escolares.
- Sección "Oferta Académica": Información detallada de las Ingenierías (Electromecánica, Sistemas, Informática, Industrial, Electrónica, Administración) y sus planes de estudio.

REGLAS OBLIGATORIAS DE RESPUESTA:
1. TOLERANCIA ORTOGRÁFICA: Ignora faltas de ortografía, errores de escritura, acentos faltantes o palabras incompletas del usuario (ejemplo: "ual" -> "cuál", "cuando" -> "cuánto", "ingnieria" -> "ingeniería"). Deduce siempre la intención real de la pregunta.
2. Responde siempre de forma breve, amable, directa y concisa (máximo 2 a 3 oraciones).
3. NUNCA SALUDES (no digas "¡Hola!", "Buenos días", ni "Como asistente virtual...") si la 'Conversación previa' ya contiene mensajes. Inicia DIRECTAMENTE con la respuesta.
4. FORMATO DE MONEDA: Escribe los montos en pesos mexicanos utilizando el formato "$XXX.XX M.N." (Ejemplo: $602.00 M.N.). NUNCA generes sintaxis con corchetes ni llaves como \${ } ni uses doble signo de pesos $$ que active sintaxis matemática.
5. NUNCA generes ni inventes enlaces que no esten en los DOCUMENTOS INDEXADOS.
6. NUNCA uses muletillas ni menciones la fuente de información como: "según los documentos", "en el portal", "de acuerdo a la información", "en la sección", "en la base de datos".
7. Responde con seguridad en primera persona como conocimiento propio institucional del Tecnológico de Estudios Superiores de Chalco.
8. Si la información no se encuentra en los DOCUMENTOS INDEXADOS, indica amablemente que NO dispones del dato exacto en este momento y sugiere consultar en las oficinas del TESCHA, PROHIBIDO INVENTAR FECHAS Y COSTOS. En este caso responde en UN SOLO BLOQUE de texto — NO agregues el segundo bloque de "en qué sección se consulta más información" descrito más abajo, ya que no aplica si no hay información que ampliar.
9. DESGLOSE DE FECHAS Y REGISTRO: Cuando pregunten por fechas, convocatorias o periodos de registro, enumera cada evento con su fecha o periodo exacto extraído de los DOCUMENTOS INDEXADOS mediante viñetas (-), especificando a qué trámite corresponde cada una.
   Ejemplo de formato:
   - Pre-registro de examen: del [Fecha inicio] al [Fecha fin]
   - Aplicación de examen: [Fecha][Hora]
   - Publicación de resultados: [Fecha]
   - Inscripción de aspirantes aceptados: del [Fecha inicio] al [Fecha fin]
   - Inicio de clases: [Fecha]
10. Cuando enumeres requisitos, documentos, carreras, opciones o pasos de un proceso, preséntalos SIEMPRE en forma de lista con viñetas Markdown (utilizando un guion '-' al inicio de cada línea).

ESTRUCTURA DE RESPUESTA (Separa la respuesta por dos saltos de línea '\\n\\n'):
- La respuesta directa a la consulta (costos, fechas o lista en viñetas) en base a la información de los DOCUMENTOS INDEXADOS. No incluyas referencias a la página web en este bloque.
- La otra respuesta corta indicando en qué sección del portal web ("Inicio", "Estudiantes" u "Oferta Académica") se consulta más información, y que también puede acudir directamente a las oficinas del TESCHA para más detalles.
- EXCEPCIÓN: si aplica la regla 8 (no tienes el dato), omite este segundo bloque por completo — responde en un único párrafo.

Documentos Indexados:
${truncatedContext}

Conversación previa:
${historyText}

Pregunta del usuario:
${question}

Respuesta:
`;

    logPerf("chat", requestId, "prompt_built", {
      ms: elapsedMs(promptStartedAt),
      prompt_chars: prompt.length,
      context_chars: truncatedContext.length,
      history_chars: historyText.length,
      history_lines_used,
      history_truncated,
      context_truncated: context.length > MAX_CONTEXT_CHARS,
      no_relevant_context: !context || context.trim().length === 0,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let firstTokenLogged = false;
        const streamStartedAt = nowMs();
        let fullResponse = "";

        try {
          logPerf("chat", requestId, "stream_start", {
            ms_since_request: elapsedMs(requestStartedAt),
          });

          // Uso directo de generateContentStream de la SDK @google/genai
          const responseStream = await generateWithRetry(prompt, requestId);

          // Iteración directa sobre la respuesta en streaming
          for await (const chunk of responseStream) {
            const token = chunk.text; // En @google/genai es propiedad .text
            if (token) {
              if (!firstTokenLogged) {
                firstTokenLogged = true;
                logPerf("chat", requestId, "first_token", {
                  ms_since_request: elapsedMs(requestStartedAt),
                  ms_since_stream_start: elapsedMs(streamStartedAt),
                });
              }
              fullResponse += token;
              controller.enqueue(encoder.encode(token));
            }
          }

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
          console.error("❌ Error en Gemini Stream:", err);
          logPerf("chat", requestId, "request_error", {
            total_ms: elapsedMs(requestStartedAt),
          });

          // Si Google está saturado (503) o se agotó la cuota (429), mostramos un
          // mensaje amigable en vez del error genérico — sin importar si ya había
          // texto parcial enviado (Gemini puede caerse a mitad del streaming, no
          // solo al inicio).
          if (isRetryableError(err)) {
            const fallbackMsg = isQuotaError(err)
              ? "El asistente alcanzó su límite de solicitudes por el momento. Por favor, espera unos segundos y vuelve a preguntar. 🙏"
              : "En este momento el servicio está saturado por alta demanda. Por favor, intenta tu pregunta de nuevo en unos segundos. 🙏";

            // Si ya se había enviado texto parcial, lo completamos en vez de
            // descartarlo — separado por un salto de línea para que se lea claro.
            const textToSend = fullResponse ? `\n\n${fallbackMsg}` : fallbackMsg;
            controller.enqueue(encoder.encode(textToSend));

            const finalResponse = fullResponse + textToSend;
            userHistory.push(`Usuario: ${question}`);
            userHistory.push(`Asistente: ${finalResponse}`);
            if (userHistory.length > MAX_MEMORY_LINES) {
              memory.set(userId, userHistory.slice(-MAX_MEMORY_LINES));
            }

            controller.close();
            return;
          }

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
    console.error("❌ Error general:", error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}