"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Mic, Paperclip, Send } from "lucide-react";

export default function ChatPanel() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔥 referencia para auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // =====================================
  // 💬 AUTO SCROLL
  // =====================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // =====================================
  // 💬 ENVIAR MENSAJE (STREAMING)
  // =====================================
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input, history: messages }),
      });

      if (!res.body) throw new Error("No hay stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let botMessage = "";

      // Crear mensaje vacío
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        botMessage += chunk;

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = botMessage;
          return updated;
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "❌ Error al procesar la consulta" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // 🎤 VOZ A TEXTO
  // =====================================
  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.start();

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
  };

  // =====================================
  // 📎 SUBIR ARCHIVO
  // =====================================
  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/chat", { method: "POST", body: formData });
      const data = await res.json();

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "❌ Error al procesar archivo" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      
      {/* MENSAJES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-2xl max-w-[80%] text-sm ${
              msg.role === "user"
                ? "bg-green-500 text-white ml-auto"
                : "bg-white border shadow-sm"
            }`}
          >
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}

        {/* 🔥 ANCLA PARA AUTO-SCROLL */}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="sticky bottom-0 z-10 bg-white/90 backdrop-blur-md border-t p-3 flex items-center gap-2">
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Paperclip size={18} />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".pdf,.txt"
        />

        <input
          className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400"
          placeholder="Escribe o dicta tu pregunta..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
        />

        <button
          onClick={startVoiceInput}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Mic size={18} />
        </button>

        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-green-500 text-white px-3 py-2 rounded-xl hover:bg-green-600 disabled:opacity-50"
        >
          <Send size={18} />
        </button>

      </div>
    </div>
  );
}