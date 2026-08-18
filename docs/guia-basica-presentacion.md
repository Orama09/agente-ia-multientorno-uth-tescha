# Guía básica — AI Avatar TESCHA

Asistente virtual institucional. Chat con RAG local, avatar por estados y voz del navegador.

**URL:** http://localhost:3000

**Stack:** Next.js 14 · Ollama local · ChromaDB · Web Speech API

La guía técnica completa está en [`guia-avatar-voz-rendimiento.md`](./guia-avatar-voz-rendimiento.md).

---

## Qué hace el sistema

1. El usuario pregunta en el panel derecho.
2. El backend busca contexto en ChromaDB (RAG).
3. Ollama genera la respuesta en streaming.
4. El avatar cambia de estado (`thinking` → `speaking` → `happy`).
5. Si la voz está activa, lee frases mientras llega el texto.

---

## Cómo se activa

| Qué | Variable / valor |
|-----|------------------|
| Avatar por imágenes (estable) | `NEXT_PUBLIC_AVATAR_PROVIDER=local-image` |
| Avatar 3D (experimental) | `NEXT_PUBLIC_AVATAR_PROVIDER=threejs` |
| Voz del navegador | `NEXT_PUBLIC_TTS_PROVIDER=web-speech` |
| Modelo rápido (CPU) | `OLLAMA_GENERATION_MODEL=llama3.2:1b` |

Reiniciar `npm run dev` si se cambia una variable `NEXT_PUBLIC_*`.

---

## Rutas más importantes

Archivos que concentran los cambios recientes.

### Chat y backend

| Archivo | Para qué |
|---------|----------|
| `src/app/api/chat/route.ts` | API del chat, prompt, historial corto |
| `src/lib/rag.ts` | Búsqueda en Chroma, menos chunks, sin fallback ciego |
| `src/lib/ollama.ts` | Streaming hacia Ollama + `keep_alive` |
| `src/lib/config.ts` | URLs, modelos, umbral RAG |
| `src/lib/performanceLog.ts` | Logs de tiempos `[chat:timing]` / `[rag:timing]` / `[ollama:timing]` |

### Avatar

| Archivo | Para qué |
|---------|----------|
| `src/components/AgentDock.tsx` | Orquesta avatar + chat; elige 2D o 3D |
| `src/components/ChatPanel.tsx` | Chat, voz, botón Detener, scroll interno |
| `src/lib/avatar/useAvatarController.ts` | Estados: idle, thinking, speaking, happy, error, listening |
| `src/components/AvatarPanel.tsx` | Avatar por imágenes (`public/images/bot`) |
| `src/lib/avatar/avatar3DConfig.ts` | Calibración 3D (escala, cámara, luces) |
| `src/components/avatar/Avatar3DPanel.tsx` | Avatar Three.js (`public/models/avatar/avatar-tescha.glb`) |

### Voz

| Archivo | Para qué |
|---------|----------|
| `src/lib/speech/useSpeechSynthesis.ts` | Voz on/off (Web Speech) |
| `src/lib/speech/useStreamingSpeechSynthesis.ts` | Lectura por frases mientras llega el stream |
| `src/lib/speech/streamSpeechText.ts` | Detecta frases (`. ? !` salto de línea) |
| `src/lib/speech/sanitizeSpeechText.ts` | Limpia markdown/URLs antes de leer |

### Layout / UX

| Archivo | Para qué |
|---------|----------|
| `src/app/layout.tsx` | Página + panel derecho fijo |
| `.env.example` / `.env.local` | Configuración local |

---

## Qué mostrar en la demo

1. Abrir http://localhost:3000 — la página no debe saltar al chatear.
2. Preguntar algo institucional — avatar en `thinking`, luego texto en stream.
3. Encender voz — empieza a hablar **antes** de terminar la respuesta.
4. **Detener** — corta la lectura.
5. (Opcional) `threejs` — rotar el modelo; vuelve solo a su pose.

---

## Límites a mencionar

- Todo corre **en local** (Ollama + Chroma); la velocidad depende del equipo.
- La voz es la del **navegador**, no un servicio de pago.
- El 3D es **experimental**; para producción se recomienda `local-image`.
