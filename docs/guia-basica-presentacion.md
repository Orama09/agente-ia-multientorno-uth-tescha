# Guía básica — AI Avatar TESCHA

Asistente virtual institucional. Chat con RAG (ChromaDB), avatar 3D por estados y voz del navegador.

**URL:** http://localhost:3000

**Stack:** Next.js 14 · Gemini (Google AI) · ChromaDB · Web Speech API · Three.js

La guía técnica completa está en [`guia-avatar-voz-rendimiento.md`](./guia-avatar-voz-rendimiento.md).

---

## Qué hace el sistema

1. El usuario pregunta en el panel derecho.
2. El backend busca contexto en ChromaDB (RAG).
3. Gemini genera la respuesta en streaming.
4. El avatar cambia de estado (`thinking` → `speaking` → `happy`).
5. Si la voz está activa, lee frases mientras llega el texto.

---

## Cómo se activa

| Qué | Variable / valor |
|-----|------------------|
| Avatar 3D | `NEXT_PUBLIC_AVATAR_PROVIDER=threejs` (único proveedor implementado) |
| Voz del navegador | `NEXT_PUBLIC_TTS_PROVIDER=web-speech` |
| Modelo de chat | `gemini-3.6-flash` (fijo en código, `src/app/api/chat/route.ts`) |
| API de Gemini | `GOOGLE_API_KEY` / `GEMINI_API_KEY` |

Reiniciar `npm run dev` si se cambia una variable `NEXT_PUBLIC_*`.

---

## Rutas más importantes

Archivos que concentran los cambios recientes.

### Chat y backend

| Archivo | Para qué |
|---------|----------|
| `src/app/api/chat/route.ts` | API del chat, prompt, historial corto, streaming con Gemini, reintentos ante 503/429 |
| `src/lib/rag.ts` | Búsqueda en Chroma, embeddings con Gemini, sin fallback ciego |
| `src/lib/config.ts` | URLs, umbral RAG (`RAG_MAX_DISTANCE`, `RAG_DISTANCE_MARGIN`) |
| `src/lib/performanceLog.ts` | Logs de tiempos `[chat:timing]` / `[rag:timing]` |

### Avatar

| Archivo | Para qué |
|---------|----------|
| `src/components/AgentDock.tsx` | Orquesta avatar + chat; monta el avatar 3D (con manejo de error si falla) |
| `src/components/ChatPanel.tsx` | Chat, voz, botón Detener, scroll interno |
| `src/lib/avatar/useAvatarController.ts` | Estados: idle, thinking, speaking, happy, error, listening |
| `src/lib/avatar/avatar3DConfig.ts` | Calibración 3D (escala, cámara, luces, mapeo de clips) |
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
5. Rotar el modelo 3D — vuelve solo a su pose frontal tras unos segundos sin interacción.

---

## Límites a mencionar

- El motor de IA (Gemini) es un **servicio en la nube de Google**, no corre en local; la velocidad depende de la conexión y de la disponibilidad del servicio (hay reintento automático si Google responde saturado o sin cuota).
- ChromaDB sí corre en local (o en el contenedor Docker).
- La voz es la del **navegador**, no un servicio de pago.
- El avatar 3D no tiene proveedor de respaldo: si falla WebGL o el modelo no carga, se muestra un mensaje de "avatar no disponible" pero el chat sigue funcionando.
