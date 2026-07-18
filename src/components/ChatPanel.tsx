"use client";

import { useState, useRef, useEffect, type ChangeEvent } from "react";
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

export default function ChatPanel({ onAvatarStateChange }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  /** Generación de operación para ignorar resultados de requests obsoletas. */
  const operationIdRef = useRef(0);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const question = input;
    const history = messages;
    const operationId = ++operationIdRef.current;

    cancelAllSpeech();
    setMessages((prev) => [...prev, { role: "user", content: question }]);
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

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
          setAvatar("speaking");
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
        // Avatar sigue en speaking hasta queue_done → happy
        setAvatar("speaking");
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

  const startVoiceInput = () => {
    if (loading || ttsSpeaking) return;

    type SpeechRecognitionLike = {
      lang: string;
      start: () => void;
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

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-MX";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = () => {
      if (!loading) setAvatar("idle");
    };

    recognition.onend = () => {
      if (!loading) setAvatar("idle");
    };

    recognition.start();
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
    <div className="flex flex-col h-full bg-gray-50">
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

        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 z-10 bg-white/90 backdrop-blur-md border-t p-3">
        <div className="flex items-center gap-2">
          <div className="shrink-0 min-w-[2.25rem] flex items-center justify-start">
            {ttsSpeaking ? (
              <StopSpeechButton onStop={handleStopSpeech} />
            ) : (
              <span className="w-9" aria-hidden />
            )}
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
            className="flex-1 min-w-0 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400"
            placeholder="Escribe o dicta tu pregunta..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={loading}
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
            className="p-2 rounded-lg hover:bg-gray-100 shrink-0"
            disabled={loading || ttsSpeaking}
            aria-label="Dictar pregunta"
            title="Dictar pregunta"
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
