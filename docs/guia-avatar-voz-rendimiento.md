# Guía técnica — Avatar, voz, rendimiento y UX

Documento de referencia para desarrolladores sobre los cambios recientes del asistente virtual institucional TESCHA (AI Avatar).

**Stack relevante:** Next.js 14 · React · TypeScript · Tailwind · Ollama local · ChromaDB · RAG · avatar por imágenes / Three.js · Web Speech API.

**Relacionado:** detalles de calibración 3D y mapeo de estados también en [`docs/avatar-voice.md`](./avatar-voice.md).

---

## 1. Resumen general

Se implementaron mejoras en cuatro frentes:

| Área | Qué cambió |
|------|------------|
| **Avatar** | Estados unificados; proveedor `local-image` (estable) y `threejs` (experimental) |
| **Voz** | Web Speech local; lectura **progresiva** durante el streaming del chat |
| **Rendimiento** | Logs de timing; prompts más cortos; modelo liviano recomendado; sin fallback RAG ciego |
| **UX** | Controles simplificados; botón Detener; scroll solo dentro del panel del chat |

**Qué no cambió de fondo:**

- La arquitectura principal del backend (`/api/chat` con streaming) se mantiene.
- El proyecto sigue usando **RAG con ChromaDB** y **Ollama local** para embeddings y generación.
- No se introdujeron APIs de TTS/LLM de pago (ElevenLabs, OpenAI, etc.).

---

## 2. Arquitectura del avatar

El avatar se controla por **estados**, no por pantallas hardcodeadas en el chat.

| Estado | Significado típico |
|--------|-------------------|
| `idle` | En reposo, listo para interactuar |
| `thinking` | Procesando la pregunta (RAG + Ollama) |
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
AvatarPanel (local-image)  o  Avatar3DPanel (threejs)
```

- **ChatPanel** no conoce rutas de imágenes ni el GLB: solo pide estados.
- **AgentDock** aplica mínimos (p. ej. tiempo mínimo en `thinking`) y elige el renderer según `NEXT_PUBLIC_AVATAR_PROVIDER`.

Así se puede cambiar el proveedor visual **sin rehacer el chat**.

Archivos clave:

- `src/types/avatar.ts`
- `src/lib/avatar/useAvatarController.ts`
- `src/lib/avatar/avatarConfig.ts`
- `src/components/AgentDock.tsx`
- `src/components/ChatPanel.tsx`

---

## 3. Avatar local por imágenes

Proveedor **por defecto** y el más estable para producción.

```env
NEXT_PUBLIC_AVATAR_PROVIDER=local-image
```

- Usa imágenes en `public/images/bot` (mapeadas por estado en la config del avatar).
- Transiciones ligeras (crossfade / preload según implementación en `AvatarPanel`).
- No requiere WebGL ni modelos 3D.

**Recomendación:** dejar `local-image` en demos institucionales o equipos modestos.

---

## 4. Avatar 3D experimental

Proveedor opcional basado en Three.js.

```env
NEXT_PUBLIC_AVATAR_PROVIDER=threejs
```

| Concepto | Valor |
|----------|--------|
| Archivo en disco | `public/models/avatar/avatar-tescha.glb` |
| URL pública | `/models/avatar/avatar-tescha.glb` |
| Librerías | `three`, `@react-three/fiber`, `@react-three/drei` |

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
- clips de animación por estado (si el GLB los trae)

Componentes: `Avatar3DPanel`, `Avatar3DModel`, `Avatar3DOrbitControls`.

### Fallback

Si falla **WebGL** o la carga del **GLB**, el dock vuelve a **`local-image`** para no romper la experiencia.

Tras cambiar la variable de entorno, **reiniciar** `npm run dev` (las `NEXT_PUBLIC_*` se inlinan en build/cliente).

---

## 5. Interacción 3D y auto-reset

- El usuario puede **rotar** el avatar (orbit controls; en móvil puede estar limitado).
- Tras unos segundos **sin interacción**, la vista vuelve sola a la posición inicial configurada.
- Ese reset es **solo de cámara/órbita**: **no** cambia `avatarState` ni interrumpe voz o chat.
- El badge de diagnóstico experimental se **eliminó** de la UI final.

---

## 6. Voz local con Web Speech API

- Usa la síntesis de voz del **navegador / sistema operativo**.
- **Sin API externa** y sin costo por uso.
- Activación/desactivación con el botón de volumen en el chat.
- Preferencias (on/off, y en storage la voz/velocidad si aplica) vía `localStorage`.

Variables:

```env
NEXT_PUBLIC_TTS_PROVIDER=web-speech
NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT=false
```

Los controles avanzados (selector de voz y barra de velocidad) se **ocultaron por UX**; la lógica del hook base se conserva por si se reactivan después.

Hook base: `src/lib/speech/useSpeechSynthesis.ts`  
Sanitización TTS: `src/lib/speech/sanitizeSpeechText.ts`

---

## 7. Voz progresiva durante streaming

### Antes

La voz esperaba a que **terminara toda** la respuesta del stream y luego leía el texto completo.

### Ahora

Con voz activada y proveedor `web-speech`, la lectura arranca **mientras** el asistente escribe.

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

No se lee palabra por palabra. Frases muy cortas se omiten salvo saludos claros; el remanente al final del stream sí se intenta leer.

### Botón Detener

Cancela:

- la utterance actual,
- la cola pendiente,
- `speechSynthesis.cancel()`,
- y evita seguir leyendo chunks de esa generación.

El avatar sale de `speaking` hacia el flujo `happy` / `idle`.

Logs de desarrollo (ejemplos): `[speech:stream] queued_sentence`, `queue_done`, `cancelled`.

---

## 8. Botón Detener y limpieza UX

### Ocultado en la UI (lógica conservada donde aplica)

- Selector de voz
- Selector de velocidad
- Botón de subir archivos / clip (el upload sigue en código, sin acceso visible)

### Visible

| Control | Comportamiento |
|---------|----------------|
| **Detener** | Aparece a la izquierda del input (donde estaba el clip) **solo mientras hay TTS activo** |
| Input | Escribir pregunta |
| Micrófono | Dictado |
| Botón voz | On/off Web Speech |
| Enviar | Dispara el chat |

---

## 9. Rendimiento con Ollama

La latencia **depende del equipo local** (CPU/RAM/GPU). Ollama corre en la máquina del desarrollador o del contenedor, no en un SaaS.

### Instrumentación

Archivo: `src/lib/performanceLog.ts`

Prefijos en consola del **servidor**:

| Prefijo | Ámbito |
|---------|--------|
| `[chat:timing]` | Handler `/api/chat` |
| `[rag:timing]` | Recuperación de contexto |
| `[ollama:timing]` | Generación / TTFT |

Cada request lleva un `requestId` corto para correlacionar líneas, p. ej. `[chat:timing][a3f9k2]`.

### Eventos útiles

| Evento | Qué indica |
|--------|------------|
| `request_start` / `request_end` | Ciclo completo de la pregunta |
| `retrieve_start` / `retrieve_end` | Duración del RAG |
| `embedding` | Tiempo de embedding (`cache_hit` si aplica) |
| `chroma_query` | Latencia de Chroma |
| `prompt_built` | Tamaño de prompt / historial / truncados |
| `first_token` | Tiempo hasta el primer token (TTFT) |
| `generate_end` | Fin de generación Ollama |

Activación:

```env
# true|false fuerza; si se omite: on en development, off en production
ENABLE_PERFORMANCE_LOGS=true
```

Los logs **no** se muestran al usuario final (solo consola del servidor). No imprimen pregunta ni contexto completos, solo longitudes y tiempos.

---

## 10. Optimizaciones aplicadas

Objetivo: bajar latencia **sin** rediseñar RAG ni el stream.

### Modelos y keep-alive

```env
OLLAMA_GENERATION_MODEL=llama3.2:1b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_KEEP_ALIVE=30m
```

- `llama3.2:1b` es el default/recomendado en **CPU / desarrollo local**.
- En equipos potentes se puede usar `llama3` vía `.env`.
- `keep_alive` reduce cold start / descarga del modelo de memoria.

### Contexto RAG e historial

| Parámetro | Valor aproximado | Dónde |
|-----------|------------------|--------|
| `MAX_CHUNKS` | `3` | `src/lib/rag.ts` |
| `MAX_CONTEXT_CHARS` | `2500` | `src/app/api/chat/route.ts` |
| `RAG_MAX_DISTANCE` | `280` (env) | `src/lib/config.ts` |
| `MAX_HISTORY_LINES` | `4` | `route.ts` |
| `MAX_HISTORY_CHARS` | `1400` | `route.ts` |

### Fallback ciego eliminado

Antes, si el filtro de distancia no dejaba resultados, se insertaban chunks **sin filtrar** (prompts largos e irrelevantes, p. ej. en “hola”).

Ahora: si nada pasa `RAG_MAX_DISTANCE`, el contexto queda vacío / “Información limitada disponible.” y el log marca `no_relevant_context=true`.

**Nota:** las distancias L2 de Chroma con `nomic-embed-text` suelen estar en cientos (~200–300). El umbral `280` es un punto de partida; puede hacer falta calibrar con documentos reales (`RAG_MAX_DISTANCE` en `.env.local`).

---

## 11. Corrección del scroll global

### Problema

El chat usaba `scrollIntoView` al actualizar mensajes. Eso hacía scroll en **ancestros**, incluido el documento: la **página principal** bajaba (p. ej. hasta Accesos Rápidos) aunque el usuario estuviera arriba.

### Solución

- Contenedor interno `messagesContainerRef` con `overflow-y-auto` y `min-h-0`.
- Auto-scroll con `scrollTo({ top: scrollHeight })` **solo** en ese contenedor.
- Panel derecho con altura acotada y `overflow-hidden` para que el scroll no “escape” a la página.

### Archivos

- `src/components/ChatPanel.tsx`
- `src/components/AgentDock.tsx`
- `src/app/layout.tsx`

**Resultado:** al chatear, solo se mueve el scroll interno del asistente; la sección visible de la página institucional se mantiene.

---

## 12. Variables de entorno relevantes

Ejemplo para `.env.local` (desarrollo):

```env
# Avatar / voz
NEXT_PUBLIC_AVATAR_PROVIDER=local-image
# NEXT_PUBLIC_AVATAR_PROVIDER=threejs
NEXT_PUBLIC_TTS_PROVIDER=web-speech
NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT=false

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_GENERATION_MODEL=llama3.2:1b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_KEEP_ALIVE=30m

# Chroma / RAG
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION_NAME=school_documents
RAG_MAX_DISTANCE=280

# Diagnóstico (opcional)
ENABLE_PERFORMANCE_LOGS=true
```

Plantilla comentada: `.env.example`.

Tras cambiar `NEXT_PUBLIC_*`, reiniciar el servidor de desarrollo.

---

## 13. Cómo probar

Checklist sugerida:

- [ ] Con `local-image`, el avatar carga y cambia de estado.
- [ ] Con `threejs` y GLB presente, el modelo 3D carga.
- [ ] Sin GLB / WebGL fallido → fallback a imágenes.
- [ ] Estados: `idle` → `thinking` → `speaking` → `happy` → `idle`; `error`; `listening` (mic).
- [ ] Voz **apagada**: flujo visual normal, sin `speechSynthesis`.
- [ ] Voz **encendida**: lectura auditable.
- [ ] Voz **progresiva**: empieza antes de terminar el stream (frases con puntuación).
- [ ] **Detener**: corta voz y limpia cola; avatar sale de speaking.
- [ ] Nueva pregunta mientras habla: cancela lectura anterior.
- [ ] Orbit 3D + auto-reset sin afectar chat/voz.
- [ ] Scroll: la página principal **no** salta; solo el área de mensajes.
- [ ] Logs `[chat:timing]` / `[rag:timing]` / `[ollama:timing]` en la terminal del `npm run dev`.

Comandos útiles de entorno:

```bash
ollama pull llama3.2:1b
ollama pull nomic-embed-text
ollama ps
npm run dev
```

---

## 14. Problemas conocidos / limitaciones

- **Web Speech** depende del navegador y de las voces instaladas en el SO.
- **No hay lip-sync** real entre boca 3D y audio.
- TTS cloud (ElevenLabs, Azure, Google, etc.) **no** está implementado.
- **Three.js** consume más GPU/CPU; en equipos débiles preferir `local-image`.
- **Ollama local** es el principal cuello de latencia (modelo + hardware).
- El umbral **RAG** puede necesitar ajuste fino con el corpus real.
- Respuestas **sin puntuación** pueden retrasar la voz hasta `finish()` del stream.
- El historial en memoria del servidor es por `userId` en proceso (no persistente entre reinicios).

---

## 15. Futuras mejoras posibles

- TTS externo opcional (p. ej. ElevenLabs) detrás del mismo contrato de hooks.
- Lip-sync / blendshapes si el GLB lo permite.
- Optimizar peso del GLB (LOD, Draco, menos materiales).
- Calibración sistemática de `RAG_MAX_DISTANCE` y métricas de relevancia.
- Warm-up automático de modelos Ollama al arrancar.
- Saltar RAG en saludos / small talk.
- Límite explícito de longitud de respuesta (`num_predict` / instrucciones).
- Panel admin de diagnósticos (timings, `ollama ps`, estado de colección).

---

## Mapa rápido de archivos tocados en estas fases

| Tema | Rutas principales |
|------|-------------------|
| Avatar estados | `useAvatarController.ts`, `AgentDock.tsx`, `AvatarPanel.tsx` |
| Avatar 3D | `avatar3DConfig.ts`, `Avatar3DPanel.tsx`, `Avatar3DModel.tsx` |
| Experiencia / env | `assistantExperienceConfig.ts`, `.env.example` |
| Voz base | `useSpeechSynthesis.ts`, `sanitizeSpeechText.ts` |
| Voz progresiva | `streamSpeechText.ts`, `useStreamingSpeechSynthesis.ts`, `ChatPanel.tsx` |
| Timing | `performanceLog.ts`, `route.ts`, `rag.ts`, `ollama.ts` |
| Optimización prompt/RAG | `config.ts`, `rag.ts`, `route.ts`, `ollama.ts` |
| Scroll UX | `ChatPanel.tsx`, `AgentDock.tsx`, `layout.tsx` |

---

*Última actualización alineada con las fases de avatar multi-proveedor, voz progresiva, medición/optimización de rendimiento y corrección de scroll del chat.*
