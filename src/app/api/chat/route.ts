// app/chat/route.ts (MODO CHATGPT REAL 🔥)
import { retrieveContext, addToRAG } from "@/lib/rag";
import pdf from "pdf-parse";

const MAX_CONTEXT_CHARS = 4000;

// 🧠 Memoria simple en servidor (puedes cambiar a DB después)
const memory = new Map<string, string[]>();

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type");

    // ===============================
    // 1️⃣ ARCHIVOS
    // ===============================
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

    // ===============================
    // 2️⃣ CHAT
    // ===============================
    const body = await req.json();
    const question = body.question || body.message;
    const userId = body.userId || "default";

    if (!question) {
      return Response.json({ error: "Pregunta inválida" }, { status: 400 });
    }

    // ===============================
    // 3️⃣ MEMORIA REAL POR USUARIO
    // ===============================
    if (!memory.has(userId)) {
      memory.set(userId, []);
    }

    const userHistory = memory.get(userId)!;

    const historyText = userHistory.join("\n");

    // ===============================
    // 4️⃣ RAG
    // ===============================
    const { context } = await retrieveContext(question);

    let finalContext = context;

    if (!finalContext || finalContext.trim().length < 20) {
      finalContext = "Información limitada disponible.";
    }

    const truncatedContext =
      finalContext.length > MAX_CONTEXT_CHARS
        ? finalContext.slice(0, MAX_CONTEXT_CHARS)
        : finalContext;

    // ===============================
    // 5️⃣ PROMPT NIVEL CHATGPT
    // ===============================
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

    // ===============================
    // 6️⃣ STREAMING (🔥 CHATGPT REAL)
    // ===============================
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const res = await fetch("http://ollama:11434/api/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama3",
              prompt,
              stream: true,
            }),
          });

          const reader = res.body!.getReader();
          let fullResponse = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (!line.trim()) continue;

              try {
                const json = JSON.parse(line);
                const token = json.response || "";

                fullResponse += token;

                controller.enqueue(encoder.encode(token));
              } catch {}
            }
          }

          // 💾 GUARDAR MEMORIA
          userHistory.push(`Usuario: ${question}`);
          userHistory.push(`Asistente: ${fullResponse}`);

          // limitar memoria
          if (userHistory.length > 20) {
            memory.set(userId, userHistory.slice(-20));
          }

          controller.close();

        } catch (err) {
          console.error(err);
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