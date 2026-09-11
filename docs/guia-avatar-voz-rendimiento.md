# Guía técnica — Avatar, voz, rendimiento y UX

Documento de referencia para desarrolladores sobre los cambios recientes del asistente virtual institucional TESCHA (AI Avatar).

**Stack relevante:** Next.js 14 · React · TypeScript · Tailwind · Gemini (Google AI) · ChromaDB · RAG · avatar 3D (Three.js) · Web Speech API.

**Relacionado:** detalles de calibración 3D y mapeo de estados también en [`docs/avatar-voice.md`](./avatar-voice.md).

---

## 1. Resumen general

Se implementaron mejoras en cuatro frentes:

| Área | Qué cambió |
|------|------------|
| **Avatar** | Estados unificados; el proyecto migró a un único proveedor, **`threejs`** (el proveedor `local-image` fue eliminado por completo) |
| **Voz** | Web Speech local; lectura **progresiva** durante el streaming del chat |
| **Rendimiento** | Logs de timing (`[chat:timing]` / `[rag:timing]`); sin fallback RAG ciego; reintentos automáticos ante 503/429 de Gemini |
| **UX** | Controles simplificados; botón Detener; scroll solo dentro del panel del chat |

**Qué no cambió de fondo:**

- La arquitectura principal del backend (`/api/chat` con streaming) se mantiene.
- El proyecto sigue usando **RAG con ChromaDB**.

**Qué sí cambió de fondo (no reflejado en la versión anterior de este documento):**

- El motor de generación y embeddings pasó de **Ollama local** a **Gemini** (Google AI SDK).
- El proveedor de avatar **`local-image`** fue eliminado; ahora solo existe `threejs`.

---

## 2. Arquitectura del avatar

El avatar se controla por **estados**, no por pantallas hardcodeadas en el chat.

| Estado | Significado típico |
|--------|-------------------|
| `idle` | En reposo, listo para interactuar |
| `thinking` | Procesando la pregunta (RAG + Gemini) |
| `speaking` | Mostrando/leyendo la respuesta |
| `happy` | Respuesta completada con éxito (luego vuelve a `idle`) |
| `error` | Fallo al procesar |
| `listening` | Micrófono / reconocimiento de voz activo |

### Separación de responsabilidades

```
ChatPanel  →  emite AvatarState (thinking, speaking, happy, …)
     ↓
AgentDock  →  useAvatarController (timings, anti-carreras)
     ↓
Avatar3DPanel (threejs, único proveedor)
```

- **ChatPanel** no conoce el GLB ni su configuración: solo pide estados.
- **AgentDock** aplica mínimos (p. ej. tiempo mínimo en `thinking`) y monta `Avatar3DPanel` de forma dinámica (`ssr: false`).

Archivos clave:

- `src/types/avatar.ts`
- `src/lib/avatar/useAvatarController.ts`
- `src/lib/avatar/avatar3DConfig.ts`
- `src/components/AgentDock.tsx`
- `src/components/avatar/Avatar3DPanel.tsx`
- `src/components/ChatPanel.tsx`

---

## 3. Avatar 3D (único proveedor)

Ya no es un proveedor "experimental" alterno: es el único avatar del proyecto.

```env
NEXT_PUBLIC_AVATAR_PROVIDER=threejs
```

| Concepto | Valor |
|----------|--------|
| Archivo en disco | `public/models/avatar/tescha_avatar_final.glb` |
| URL pública | `/models/avatar/tescha_avatar_final.glb` |
| Librerías | `three`, `@react-three/fiber`, `@react-three/drei` |
| Animaciones | El GLB incluye clips nombrados por estado (`idle`, `thinking`, `speaking`, `happy`, `error`, `listening`) |

### Configuración centralizada

Todo el ajuste visual vive en:

```text
src/lib/avatar/avatar3DConfig.ts
```

Ahí se calibran, entre otros:

- `scale` / `position` / `rotation` del modelo
- cámara (posición, FOV, target)
- luces
- orbit controls
- auto-reset de la cámara/órbita
- clips de animación por estado

Componentes: `Avatar3DPanel`, `Avatar3DModel`, `Avatar3DOrbitControls`.

### Comportamiento si falla WebGL o el GLB

Ya **no** existe un proveedor de respaldo (`local-image` fue eliminado). El manejo real es vía un error boundary en `Avatar3DPanel`:

1. Si falla el render 3D, el boundary lo captura y dispara `onFatalError`.
2. `AgentDock` reemplaza por completo el panel del avatar con el mensaje **"El avatar no está disponible en este momento."**
3. El chat y el módulo de trámites **siguen funcionando con normalidad**; solo se pierde la parte visual del avatar.

(Detalle completo en [`docs/avatar-voice.md`](./avatar-voice.md), sección I.)

Tras cambiar variables `NEXT_PUBLIC_*`, **reiniciar** `npm run dev` (se inlinan en build/cliente).

---

## 4. Interacción 3D y auto-reset

- El usuario puede **rotar** el avatar (orbit controls; en móvil puede estar limitado).
- Tras unos segundos **sin interacción**, la vista vuelve sola a la posición inicial configurada.
- Ese reset es **solo de cámara/órbita**: **no** cambia `avatarState` ni interrumpe voz o chat.

---

## 5. Voz local con Web Speech API

- Usa la síntesis de voz del **navegador / sistema operativo**.
- **Sin API externa** y sin costo por uso.
- Activación/desactivación con el botón de volumen en el chat.
- Preferencias (on/off, y en storage la voz/velocidad si aplica) vía `localStorage`.

Variables:

```env
NEXT_PUBLIC_TTS_PROVIDER=web-speech
NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT=false
```

Hook base: `src/lib/speech/useSpeechSynthesis.ts`
Sanitización TTS: `src/lib/speech/sanitizeSpeechText.ts`

---

## 6. Voz progresiva durante streaming

Con voz activada y proveedor `web-speech`, la lectura arranca **mientras** el asistente escribe (no espera a que termine todo el stream).

### Flujo

1. Llegan chunks del stream de `/api/chat`.
2. Se acumulan en un buffer.
3. Se detectan **frases completas**.
4. Cada frase se encola.
5. Web Speech lee la cola en orden.
6. Al terminar el stream se lee el **remanente** (si quedó texto sin punto final).
7. Cuando la cola queda vacía → avatar `happy` → `idle`.

### Archivos

| Archivo | Rol |
|---------|-----|
| `src/lib/speech/streamSpeechText.ts` | Corte de frases + logs `[speech:stream]` |
| `src/lib/speech/useStreamingSpeechSynthesis.ts` | Cola, `start` / `pushText` / `finish` / `cancel` |
| `src/components/ChatPanel.tsx` | Integra progresivo en el stream |

### Delimitadores de frase

- Punto `.`
- Signo de pregunta `?`
- Signo de exclamación `!`
- Salto de línea
- Dos puntos `:` **solo** si la frase previa es suficientemente larga

### Botón Detener

Cancela la utterance actual, la cola pendiente, `speechSynthesis.cancel()`, y evita seguir leyendo chunks de esa generación. El avatar sale de `speaking` hacia el flujo `happy` / `idle`.

---

## 7. Controles UX del chat

| Control | Comportamiento |
|---------|----------------|
| **Detener** | Aparece junto al input **solo mientras hay TTS activo** |
| Input | Escribir pregunta |
| Micrófono | Dictado |
| Botón voz | On/off Web Speech |
| Enviar | Dispara el chat |

---

## 8. Rendimiento

Instrumentación centralizada en `src/lib/performanceLog.ts`. Activación:

```env
# true|false fuerza; si se omite: on en development, off en production
ENABLE_PERFORMANCE_LOGS=true
```

Los logs viven solo en la **consola del servidor**, nunca se muestran al usuario final. No imprimen la pregunta ni el contexto completos, solo longitudes y tiempos.

### Prefijos y alcance

No existe un prefijo dedicado a Gemini — las llamadas al modelo se miden dentro del scope `chat` (en `route.ts`), y la recuperación de contexto dentro del scope `rag` (en `rag.ts`). No hay un archivo separado tipo `ollama.ts`/`gemini.ts`: la llamada a la API de Gemini (`@google/genai`) está directamente en `route.ts` (chat) y `rag.ts` (embeddings).

| Prefijo | Ámbito | Archivo |
|---------|--------|---------|
| `[chat:timing][id]` | Handler `/api/chat`: prompt, streaming, reintentos | `route.ts` |
| `[rag:timing][id]` | Recuperación de contexto en ChromaDB + embeddings | `rag.ts` |

Cada request lleva un `requestId` corto (`createRequestId()`) para correlacionar líneas.

### Eventos registrados

| Evento | Scope | Qué indica |
|--------|-------|------------|
| `request_start` / `request_end` | chat | Ciclo completo de la pregunta |
| `canned_reply` | chat | Se respondió con saludo/plantilla fija, sin llamar a Gemini |
| `retrieve_start` / `retrieve_end` | chat, rag | Duración del RAG |
| `get_collection_id` | rag | Tiempo en resolver el ID de colección de Chroma (cacheado tras la 1ª vez) |
| `embedding` / `embedding_error` | rag | Tiempo de embedding con Gemini (`cache_hit` si aplica) |
| `chroma_query` | rag | Latencia de la consulta a ChromaDB |
| `prompt_built` | chat | Tamaño de prompt / historial / contexto, y si se truncaron |
| `stream_start` | chat | Inicio del streaming de Gemini |
| `first_token` | chat | Tiempo hasta el primer token (TTFT) |
| `stream_end` | chat | Fin del streaming, tamaño de la respuesta |
| `retry` | chat | Reintento automático por error 503 (saturación) o 429 (cuota agotada), con el `delay_ms` sugerido por la propia API |
| `request_error` | chat | Error no recuperable |

### Reintentos automáticos (Gemini)

`route.ts` reintenta una vez automáticamente si Gemini responde **503** (saturado) o **429** (cuota agotada), esperando el `retryDelay` que la propia API sugiere en el error (tope de 8 segundos). Si tras el reintento sigue fallando, se envía un mensaje amigable al usuario en vez del error crudo, distinguiendo cuota agotada de saturación temporal.

### Fallback ciego eliminado (RAG)

Antes, si el filtro de distancia no dejaba resultados, se insertaban chunks **sin filtrar**. Ahora: si nada pasa el umbral, el contexto queda vacío / "Información limitada disponible." y el log marca `no_relevant_context=true`.

Con la migración a Gemini (`gemini-embedding-001`, vectores normalizados manualmente a 768 dimensiones), la escala de distancia L2 cambió de "cientos" (época Ollama/nomic-embed-text) a un rango de **0 a 2**. El umbral real actual (`src/lib/config.ts`) es:

```env
RAG_MAX_DISTANCE=0.8
RAG_DISTANCE_MARGIN=0.15
```

### Constantes de contexto e historial

| Constante | Valor | Archivo | Qué limita |
|-----------|-------|---------|------------|
| `MAX_CHUNKS` | `3` | `rag.ts` | Chunks de RAG que entran al prompt |
| `MAX_CONTEXT_CHARS` | `1800` | `route.ts` | Tope de caracteres del contexto RAG en el prompt |
| `MAX_HISTORY_LINES` | `4` | `route.ts` | Líneas de historial (Usuario/Asistente) enviadas al prompt |
| `MAX_HISTORY_CHARS` | `1400` | `route.ts` | Tope duro de caracteres de historial en el prompt |
| `MAX_MEMORY_LINES` | `20` | `route.ts` | Líneas que se guardan en memoria del servidor por `userId` (más de las que van al prompt) |

El historial en memoria del servidor (`Map<userId, string[]>` en `route.ts`) sigue siendo **por proceso, no persistente entre reinicios** — esto no cambió con la migración a Gemini.

Modelo de chat: `gemini-3.6-flash` (`temperature: 0`, `topP: 0.1`, `thinkingLevel: MINIMAL`, `maxOutputTokens: 800`).
Modelo de embeddings: `gemini-embedding-001`, truncado a 768 dimensiones y normalizado manualmente (Gemini no normaliza automáticamente las dimensiones truncadas).

---

## 9. Corrección del scroll global

### Problema

El chat usaba `scrollIntoView` al actualizar mensajes. Eso hacía scroll en **ancestros**, incluido el documento: la **página principal** bajaba aunque el usuario estuviera arriba.

### Solución

- Contenedor interno `messagesContainerRef` con `overflow-y-auto` y `min-h-0`.
- Auto-scroll con `scrollTo({ top: scrollHeight })` **solo** en ese contenedor.
- Panel derecho con altura acotada y `overflow-hidden` para que el scroll no "escape" a la página.

### Archivos

- `src/components/ChatPanel.tsx`
- `src/components/AgentDock.tsx`
- `src/app/layout.tsx`

**Resultado:** al chatear, solo se mueve el scroll interno del asistente; la sección visible de la página institucional se mantiene.

---

## 10. Variables de entorno relevantes

```env
# Avatar / voz
NEXT_PUBLIC_AVATAR_PROVIDER=threejs
NEXT_PUBLIC_TTS_PROVIDER=web-speech
NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT=false

# Gemini (Google AI)
GOOGLE_API_KEY=
GEMINI_API_KEY=

# Chroma / RAG
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION_NAME=school_documents
RAG_MAX_DISTANCE=0.8
RAG_DISTANCE_MARGIN=0.15

# Postgres (módulo de trámites)
POSTGRES_USER=tescha_admin
POSTGRES_PASSWORD=
POSTGRES_DB=tramites

# Trámites
SENDGRID_API_KEY=
SENDGRID_TO_EMAIL=
ADMIN_KEY=
APP_BASE_URL=http://localhost:3000

# Diagnóstico (opcional)
ENABLE_PERFORMANCE_LOGS=true
```

Plantilla comentada: `.env.example`.

Tras cambiar `NEXT_PUBLIC_*`, reiniciar el servidor de desarrollo.

---

## 11. Cómo probar

Checklist sugerida:

- [ ] El avatar 3D carga y cambia de estado correctamente.
- [ ] Sin GLB / WebGL fallido → aparece el mensaje "El avatar no está disponible en este momento" y el chat sigue usable.
- [ ] Estados: `idle` → `thinking` → `speaking` → `happy` → `idle`; `error`; `listening` (mic).
- [ ] Voz **apagada**: flujo visual normal, sin `speechSynthesis`.
- [ ] Voz **encendida**: lectura auditable.
- [ ] Voz **progresiva**: empieza antes de terminar el stream (frases con puntuación).
- [ ] **Detener**: corta voz y limpia cola; avatar sale de speaking.
- [ ] Nueva pregunta mientras habla: cancela lectura anterior.
- [ ] Orbit 3D + auto-reset sin afectar chat/voz.
- [ ] Scroll: la página principal **no** salta; solo el área de mensajes.
- [ ] Logs `[chat:timing]` / `[rag:timing]` en la terminal del `npm run dev`.

---

## 12. Problemas conocidos / limitaciones

- **Web Speech** depende del navegador y de las voces instaladas en el SO.
- **No hay lip-sync** real entre boca 3D y audio.
- TTS cloud (ElevenLabs, Azure, Google, etc.) **no** está implementado.
- **Three.js** consume más GPU/CPU que una alternativa 2D (ya no hay alternativa 2D como respaldo).
- El umbral **RAG** (`0.8` / `0.15`) puede necesitar ajuste fino con el corpus real.
- Respuestas **sin puntuación** pueden retrasar la voz hasta `finish()` del stream.
- El historial en memoria del servidor es por `userId` en proceso (no persistente entre reinicios); se guardan hasta `MAX_MEMORY_LINES=20` líneas, aunque al prompt solo entran las últimas `MAX_HISTORY_LINES=4`.
- `config.ts` aún conserva constantes de Ollama sin usar (`OLLAMA_URL`, `OLLAMA_GENERATION_MODEL`, etc.) pendientes de limpieza.
- Sin reintento automático más allá de un solo intento extra ante 503/429 de Gemini; si vuelve a fallar, se muestra un mensaje de saturación/cuota al usuario.

---

## 13. Futuras mejoras posibles

- TTS externo opcional (p. ej. ElevenLabs) detrás del mismo contrato de hooks.
- Lip-sync / blendshapes si el GLB lo permite.
- Optimizar peso del GLB (LOD, Draco, menos materiales).
- Calibración sistemática de `RAG_MAX_DISTANCE` / `RAG_DISTANCE_MARGIN` y métricas de relevancia.
- Saltar RAG en saludos / small talk.
- Límite explícito de longitud de respuesta.
- Panel admin de diagnósticos (timings, estado de la colección Chroma).
- Limpieza del código muerto de Ollama en `config.ts`.

---

## Mapa rápido de archivos tocados en estas fases

| Tema | Rutas principales |
|------|-------------------|
| Avatar estados | `useAvatarController.ts`, `AgentDock.tsx` |
| Avatar 3D | `avatar3DConfig.ts`, `Avatar3DPanel.tsx`, `Avatar3DModel.tsx` |
| Experiencia / env | `assistantExperienceConfig.ts`, `.env.example` |
| Voz base | `useSpeechSynthesis.ts`, `sanitizeSpeechText.ts` |
| Voz progresiva | `streamSpeechText.ts`, `useStreamingSpeechSynthesis.ts`, `ChatPanel.tsx` |
| Timing | `performanceLog.ts`, `route.ts`, `rag.ts` |
| Optimización prompt/RAG | `config.ts`, `rag.ts`, `route.ts` |
| Scroll UX | `ChatPanel.tsx`, `AgentDock.tsx`, `layout.tsx` |

---

*Última actualización alineada con la migración a avatar 3D único, motor Gemini (`gemini-3.6-flash` + `gemini-embedding-001`), umbral RAG recalibrado (0.8 / 0.15) y reintentos automáticos ante saturación/cuota de la API.*
