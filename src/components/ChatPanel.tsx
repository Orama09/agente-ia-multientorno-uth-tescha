"use client";

import { useState, useRef, useEffect, type ChangeEvent, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import { Mic, Send, Volume2, VolumeX } from "lucide-react";
import type { AvatarStateChangeHandler } from "@/types/avatar";
import {
  assistantExperience,
  isWebSpeechTtsEnabled,
} from "@/lib/assistant/assistantExperienceConfig";
import { useSpeechSynthesis } from "@/lib/speech/useSpeechSynthesis";
import { useStreamingSpeechSynthesis } from "@/lib/speech/useStreamingSpeechSynthesis";
import { StopSpeechButton } from "./SpeechControls";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatPanelProps = {
  /** Solo emite AvatarState; timings y anti-carreras viven en AgentDock. */
  onAvatarStateChange?: AvatarStateChangeHandler;
};

const ERROR_MESSAGE = "❌ Error al procesar la consulta";
const FILE_ERROR_MESSAGE = "❌ Error al procesar archivo";

/** Estilos explícitos para listas markdown — no dependen del plugin de tipografía de Tailwind. */
const markdownListComponents = {
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="list-disc pl-5 space-y-0.5 marker:text-green-500" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="list-decimal pl-5 space-y-0.5 marker:text-green-600 marker:font-semibold" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="pl-1" {...props} />
  ),
};

/**
 * Tarjeta de bienvenida con consejos de uso — solo se muestra antes del
 * primer mensaje; una vez que la conversación empieza, cede el espacio.
 */
function WelcomeTips() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-200 border border-emerald-400/40 p-4 text-sm text-gray-700 space-y-2.5">
      <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
        Antes de empezar, un par de tips:
      </p>
      <ul className="space-y-1.5 pl-1">
        <li className="flex gap-2">
          <span aria-hidden>🎯</span>
          <span>Sé específico — mientras más clara la pregunta, mejor la respuesta.</span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden>⏳</span>
          <span>Un poco de paciencia: a veces tardo unos segundos en responder.</span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden>🔄</span>
          <span>
            Si estoy muy solicitado, espera un momento y vuelve a preguntar —
            sigo aquí.
          </span>
        </li>
      </ul>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div
      className="p-3 my-1 rounded-2xl text-sm bg-white border shadow-sm max-w-[85%] w-fit flex items-center gap-1"
      role="status"
      aria-live="polite"
      aria-label="El asistente está escribiendo"
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

export default function ChatPanel({ onAvatarStateChange }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Contenedor scrolleable interno (nunca scrollIntoView / window). */
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  /** Generación de operación para ignorar resultados de requests obsoletas. */
  const operationIdRef = useRef(0);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const ttsAvailable = isWebSpeechTtsEnabled();

  const {
    isSupported: speechSupported,
    isEnabled: speechEnabled,
    isSpeaking: oneshotSpeaking,
    selectedVoiceURI,
    rate: speechRate,
    setEnabled: setSpeechEnabled,
    speak,
    cancel: cancelSpeech,
  } = useSpeechSynthesis({
    enabledByDefault: assistantExperience.voiceEnabledByDefault,
    providerActive: ttsAvailable,
  });

  const {
    isSpeaking: streamSpeaking,
    start: startStreamSpeech,
    pushText: pushStreamSpeech,
    finish: finishStreamSpeech,
    cancel: cancelStreamSpeech,
  } = useStreamingSpeechSynthesis({
    voiceURI: selectedVoiceURI,
    rate: speechRate,
    enabled: speechEnabled,
    supported: speechSupported && ttsAvailable,
  });

  const ttsSpeaking = oneshotSpeaking || streamSpeaking;
  const showSpeechToggle = ttsAvailable;

  const useProgressiveSpeech =
    speechEnabled && speechSupported && ttsAvailable;

  const setAvatar = (state: Parameters<AvatarStateChangeHandler>[0]) => {
    onAvatarStateChange?.(state);
  };

  // Sincroniza el avatar con el AUDIO real, no con la llegada de texto.
  // streamSpeaking se pone en true justo cuando el sintetizador dispara
  // onstart (el audio ya está sonando) — antes el avatar se ponía a
  // "hablar" en cuanto llegaba el primer texto del streaming, mucho antes
  // de que hubiera sonido real, causando el desfase boca/audio.
  useEffect(() => {
    if (streamSpeaking) {
      setAvatar("speaking");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamSpeaking]);

  const cancelAllSpeech = () => {
    cancelStreamSpeech();
    cancelSpeech();
  };

  const replaceOrAppendAssistant = (content: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content };
        return updated;
      }
      return [...prev, { role: "assistant", content }];
    });
  };

  /**
   * Respuesta one-shot (p. ej. upload): con voz → speak completo → happy;
   * sin voz → happy inmediato.
   */
  const finishSuccessfulReply = (text: string, operationId: number) => {
    if (operationId !== operationIdRef.current) return;

    if (!speechEnabled) {
      setAvatar("happy");
      return;
    }

    setAvatar("speaking");

    const started = speak(text, {
      onEnd: () => {
        if (operationId !== operationIdRef.current) return;
        setAvatar("happy");
      },
      onError: () => {
        if (operationId !== operationIdRef.current) return;
        setAvatar("happy");
      },
    });

    if (!started) {
      setAvatar("happy");
    }
  };

  const failReply = (message: string, operationId: number) => {
    if (operationId !== operationIdRef.current) return;
    cancelAllSpeech();
    replaceOrAppendAssistant(message);
    setAvatar("error");
  };

  // Auto-scroll solo dentro del panel de mensajes (no mueve la página).
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const question = input;
    const history = messages;
    const operationId = ++operationIdRef.current;

    cancelAllSpeech();
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setLoading(true);
    setAvatar("thinking");

    const progressive = useProgressiveSpeech;
    if (progressive) {
      startStreamSpeech({
        onDone: () => {
          if (operationId !== operationIdRef.current) return;
          setAvatar("happy");
        },
      });
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });

      if (operationId !== operationIdRef.current) return;

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No hay stream");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let botMessage = "";
      let speakingStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (operationId !== operationIdRef.current) {
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
          return;
        }

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        botMessage += chunk;

        if (!speakingStarted && botMessage.trim().length > 0) {
          speakingStarted = true;
          // Con voz progresiva, el avatar se sincroniza con streamSpeaking
          // (efecto de arriba) — aquí solo se dispara de inmediato cuando
          // NO hay audio con el que desincronizarse.
          if (!progressive) {
            setAvatar("speaking");
          }
        }

        if (progressive) {
          pushStreamSpeech(chunk);
        }

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: botMessage,
          };
          return updated;
        });
      }

      if (operationId !== operationIdRef.current) return;

      if (!botMessage.trim()) {
        failReply(ERROR_MESSAGE, operationId);
      } else if (progressive) {
        // El efecto que observa streamSpeaking ya sincroniza el avatar con
        // el audio real (incluida la última oración, encolada aquí).
        finishStreamSpeech();
      } else {
        finishSuccessfulReply(botMessage, operationId);
      }
    } catch (error) {
      if (operationId !== operationIdRef.current) return;
      console.error("Error:", error);
      failReply(ERROR_MESSAGE, operationId);
    } finally {
      if (operationId === operationIdRef.current) {
        setLoading(false);
      }
    }
  };

  const stopVoiceInput = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setIsListening(false);
    if (!loading) setAvatar("idle");
  };

  const startVoiceInput = () => {
    if (loading || ttsSpeaking) return;

    if (isListening) {
      stopVoiceInput();
      return;
    }

    type SpeechRecognitionLike = {
      lang: string;
      start: () => void;
      stop: () => void;
      onresult: ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
    };

    const w = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };

    const SpeechRecognitionCtor =
      w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    setAvatar("listening");
    setIsListening(true);

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-MX";
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsListening(false);
      if (!loading) setAvatar("idle");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      if (!loading) setAvatar("idle");
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      if (!loading) setAvatar("idle");
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const operationId = ++operationIdRef.current;
    cancelAllSpeech();
    setLoading(true);
    setAvatar("thinking");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/chat", { method: "POST", body: formData });
      if (operationId !== operationIdRef.current) return;

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as { response?: string };
      const content = data.response?.trim() ?? "";

      if (!content) {
        failReply(FILE_ERROR_MESSAGE, operationId);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response ?? "" },
        ]);
        finishSuccessfulReply(data.response ?? "", operationId);
      }
    } catch {
      if (operationId !== operationIdRef.current) return;
      failReply(FILE_ERROR_MESSAGE, operationId);
    } finally {
      if (operationId === operationIdRef.current) {
        setLoading(false);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSpeechToggle = () => {
    if (!speechSupported) return;

    if (speechEnabled && ttsSpeaking) {
      cancelAllSpeech();
      setSpeechEnabled(false);
      setAvatar("happy");
      return;
    }

    setSpeechEnabled(!speechEnabled);
  };

  /** Detener: cancela utterance + cola progresiva y cierra avatar con happy. */
  const handleStopSpeech = () => {
    cancelAllSpeech();
    setAvatar("happy");
  };

  const speechLabel = !speechSupported
    ? "Voz no disponible en este navegador"
    : speechEnabled
      ? "Voz activada — clic para desactivar"
      : "Voz desactivada — clic para activar";

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50">
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4"
      >
        {messages.length === 0 && <WelcomeTips />}
        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div
                key={i}
                className="p-3 rounded-2xl max-w-[80%] text-sm bg-green-500 text-white ml-auto"
              >
                <div className="prose prose-sm max-w-none text-white">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            );
          }

          const isLastMessage = i === messages.length - 1;
          const isEmpty = msg.content.trim() === "";

          // Mientras se espera el primer fragmento del streaming, se
          // muestra el indicador de "escribiendo..." en vez de una
          // burbuja vacía.
          if (isLastMessage && loading && isEmpty) {
            return <ThinkingBubble key={i} />;
          }

          return (
            <div key={i} className="flex flex-col gap-2 max-w-[80%]">
              {msg.content
                .split(/\n\s*\n/)
                .filter((block) => block.trim() !== "")
                .map((block, bIdx) => (
                  <div
                    key={bIdx}
                    className="p-3 my-1 rounded-2xl text-sm bg-white border shadow-sm max-w-[85%]"
                  >
                    <ReactMarkdown components={markdownListComponents}>
                      {block.trim()}
                    </ReactMarkdown>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
      <div className="shrink-0 z-10 bg-white/90 backdrop-blur-md border-t p-3">
        {isListening && (
          <div
            className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700"
            role="status"
            aria-live="polite"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            Escuchando… habla ahora. Clic otra vez en el micrófono para cancelar.
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="shrink-0 min-w-[2.25rem] flex items-center justify-start">
            <StopSpeechButton onStop={handleStopSpeech} active={ttsSpeaking} />
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.txt"
            tabIndex={-1}
            aria-hidden
          />

          <input
            className={`flex-1 min-w-0 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ${
              isListening
                ? "border-red-300 ring-2 ring-red-200 bg-red-50/40"
                : "focus:ring-green-400"
            }`}
            placeholder={
              isListening
                ? "Escuchando… habla ahora"
                : "Escribe o dicta tu pregunta..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={loading || isListening}
          />

          {showSpeechToggle && (
            <button
              type="button"
              onClick={handleSpeechToggle}
              disabled={!speechSupported}
              className={`p-2 rounded-lg transition-colors shrink-0 ${
                !speechSupported
                  ? "text-gray-300 cursor-not-allowed"
                  : speechEnabled
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "text-gray-600 hover:bg-gray-100"
              }`}
              aria-label={speechLabel}
              aria-pressed={speechSupported ? speechEnabled : undefined}
              title={speechLabel}
            >
              {speechEnabled && speechSupported ? (
                <Volume2 size={18} />
              ) : (
                <VolumeX size={18} />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={startVoiceInput}
            className={`p-2 rounded-lg shrink-0 transition-colors ${
              isListening
                ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                : "hover:bg-gray-100 text-gray-700"
            }`}
            disabled={loading || ttsSpeaking}
            aria-label={isListening ? "Dejar de escuchar" : "Dictar pregunta"}
            aria-pressed={isListening}
            title={
              isListening
                ? "Escuchando — clic para cancelar"
                : "Dictar pregunta"
            }
          >
            <Mic size={18} />
          </button>

          <button
            type="button"
            onClick={sendMessage}
            disabled={loading}
            className="bg-green-500 text-white px-3 py-2 rounded-xl hover:bg-green-600 disabled:opacity-50 shrink-0"
            aria-label="Enviar mensaje"
            title="Enviar"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
