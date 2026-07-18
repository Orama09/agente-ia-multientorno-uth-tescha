# Módulo Avatar y Voz

Documentación técnica del módulo de experiencia del asistente (avatar visual + TTS) en **AI Avatar**.

Público objetivo: desarrolladores que mantengan o extiendan el dock del asistente.

---

## A. Descripción general

El avatar funciona por **estados** (`AvatarState`). El chat no conoce imágenes ni motores 3D: solo emite estados. Un controlador central (`useAvatarController`) aplica timings y anti-carreras; un **renderer** decide cómo mostrarlos.

| Capa | Implementación actual |
|------|------------------------|
| Visual (default) | Imágenes estáticas (`local-image`) en `public/images/bot` |
| Visual (experimental) | GLB Three.js (`threejs`) en `public/models/avatar/avatar-tescha.glb` |
| Voz (TTS) | Web Speech API del navegador (`web-speech`), opcional y desactivada por defecto |

La arquitectura admite proveedores futuros (Rive, Live2D, LiveAvatar/HeyGen, TTS externo) sin reescribir el flujo del chat.

---

## B. Arquitectura general

```
ChatPanel
  ├── emite AvatarState vía onAvatarStateChange
  ├── controla TTS vía useSpeechSynthesis
  └── renderiza SpeechControls (si voz activa)

AgentDock
  ├── posee useAvatarController (dueño del estado)
  └── AvatarExperienceRenderer según avatarProvider

AvatarPanel (local-image)
  └── frames + crossfade + labels desde avatarConfig

Avatar3DPanel (threejs, experimental)
  └── GLB + clips vía avatar3DConfig (dynamic, sin SSR)

avatarConfig.ts
  └── imágenes, rotationMs, label, alt por estado

useAvatarController.ts
  └── estados, timeouts, generation id, anti-carreras

assistantExperienceConfig.ts
  └── NEXT_PUBLIC_* → avatarProvider / ttsProvider / voiceEnabledByDefault
```

Contrato clave: **ChatPanel emite estados; AgentDock orquesta; el panel solo renderiza**.

Archivos principales:

| Archivo | Rol |
|---------|-----|
| `src/types/avatar.ts` | `AvatarState` y helpers |
| `src/types/assistantExperience.ts` | Tipos de proveedores |
| `src/lib/assistant/assistantExperienceConfig.ts` | Resolución de env |
| `src/lib/avatar/avatarConfig.ts` | Frames y labels |
| `src/lib/avatar/useAvatarController.ts` | Sincronización |
| `src/lib/speech/useSpeechSynthesis.ts` | TTS Web Speech |
| `src/lib/speech/sanitizeSpeechText.ts` | Limpieza de texto |
| `src/lib/speech/speechStorage.ts` | Preferencias localStorage |
| `src/components/AgentDock.tsx` | Orquestación |
| `src/components/AvatarPanel.tsx` | Renderer imágenes |
| `src/components/ChatPanel.tsx` | Chat + emisión de estados |
| `src/components/SpeechControls.tsx` | UI de voz |

---

## C. Estados del avatar

Definidos en `src/types/avatar.ts` y configurados en `avatarConfig.ts`.

| Estado | Cuándo se activa | Representa | Imágenes | Rotación |
|--------|------------------|------------|----------|----------|
| `idle` | Inicio; tras happy/error; fin de mic | Listo | `normal.png` | No |
| `thinking` | Usuario envía mensaje o sube archivo | Analizando | `pensando` … `pensando4` | Cada 3 s |
| `speaking` | Primer contenido real del stream; se mantiene durante TTS | Respondiendo | `hablando`, `explicandoManoArriba`, `saludoNormal`, `saludando` | Cada 2 s |
| `happy` | Respuesta OK (y fin de TTS si voz on) | Consulta atendida | `saludandoFeliz`, `riendo` | Cada 1.8 s |
| `error` | Fallo HTTP/stream/respuesta vacía | Problema | `serio.png` | No |
| `listening` | Micrófono de dictado activo | Escuchando | `normal.png` | No |

Labels UI (debajo del título): “Listo para ayudarte”, “Analizando tu pregunta…”, etc.

Timings del controlador (`avatarConfig.ts` / constantes):

- Mínimo en `thinking` antes de `speaking`: **800 ms**
- `happy` → `idle`: **1500 ms**
- `error` → `idle`: **3000 ms**

---

## D. Flujo conversacional

### Voz apagada

```
idle → thinking → speaking → happy → idle
```

### Voz encendida

```
idle → thinking → speaking → (TTS lee respuesta final) → happy → idle
```

Mientras `speechSynthesis` habla, el avatar permanece en `speaking`. Al terminar (o al detener), pasa a `happy` y luego a `idle`.

### Error

```
thinking → error → idle
```

(también si el stream termina vacío)

### Upload de documento

```
thinking → happy → idle   (éxito)
thinking → error → idle   (fallo)
```

### Micrófono (dictado)

```
idle → listening → idle
```

No interrumpe `thinking`/`speaking` si hay una respuesta en curso.

---

## E. Sincronización y anti-carreras

### `useAvatarController` (AgentDock)

- **`generationRef`**: cada `thinking` incrementa la generación. Los timeouts de `speaking` diferido, `happy→idle` y `error→idle` guardan esa generación; si no coincide, se ignoran.
- **`timeoutRef`**: un solo timer activo; al pedir un estado nuevo se limpia el pendiente.
- Evita que un `happy→idle` de una respuesta anterior apague el avatar mientras una nueva ya está en `speaking`.

### `ChatPanel`

- **`operationIdRef`**: cada envío/upload incrementa un id. Resultados de fetch/stream obsoletos se descartan.
- **`speaking`**: solo cuando el texto acumulado del asistente tiene contenido real (`trim().length > 0`), no con chunks vacíos.
- Nueva pregunta / error / upload → `cancelSpeech()` para cortar TTS previo.

---

## F. Configuración de imágenes

Ubicación: `public/images/bot/`.

| Archivo | Uso típico |
|---------|------------|
| `normal.png` | idle, listening |
| `pensando.png` … `pensando4.png` | thinking |
| `hablando.png` | speaking |
| `explicandoManoArriba.png` | speaking |
| `saludoNormal.png` | speaking |
| `saludando.png` | speaking |
| `saludandoFeliz.png` | happy |
| `riendo.png` | happy |
| `serio.png` | error |

### Agregar una pose nueva

1. Colocar el PNG en `public/images/bot/`.
2. Añadir la ruta en el array `frames` del estado en `src/lib/avatar/avatarConfig.ts`.
3. Ajustar `rotationMs` si el estado debe rotar (o `null` si es fijo).
4. Actualizar `label` / `alt` si cambia el significado del estado.

La precarga de frames ocurre en `AvatarPanel` (cliente, vía `getAllAvatarFrameSrcs()`).

---

## G. Configuración de voz

| Pieza | Responsabilidad |
|-------|-----------------|
| `useSpeechSynthesis.ts` | speak / cancel, voces, rate, enabled, soporte API |
| `sanitizeSpeechText.ts` | Quitar markdown ruidoso, URLs largas, código extenso |
| `SpeechControls.tsx` | Selectores de voz/velocidad + botón detener |
| `speechStorage.ts` | Lectura/escritura SSR-safe de preferencias |

### Controles en UI

Visibles cuando `NEXT_PUBLIC_TTS_PROVIDER=web-speech`, la API existe y la voz está **activada**:

| Control | Acción |
|---------|--------|
| Botón Volume | Activa / desactiva voz |
| Selector de voz | Elige `SpeechSynthesisVoice` |
| Selector de velocidad | `0.8x` / `1x` / `1.2x` |
| Detener | Cancela TTS y lleva el avatar a `happy` |

Si `ttsProvider === none`, el botón de voz se oculta.

La lectura es de la **respuesta final completa**, no chunk a chunk.

---

## H. localStorage

| Clave | Contenido |
|-------|-----------|
| `ai-avatar.voice.enabled` | `true` / `false` |
| `ai-avatar.voice.uri` | `voiceURI` seleccionada |
| `ai-avatar.voice.rate` | `0.8` / `1` / `1.2` |

`NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT` **solo** aplica si aún no existe `ai-avatar.voice.enabled`. Tras la primera elección del usuario, prevalece localStorage.

---

## I. Variables de entorno

Definidas en `.env.example` / `.env.local`:

```bash
NEXT_PUBLIC_AVATAR_PROVIDER=local-image
NEXT_PUBLIC_TTS_PROVIDER=web-speech
NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT=false
```

| Variable | Valores implementados | Notas |
|----------|----------------------|--------|
| `NEXT_PUBLIC_AVATAR_PROVIDER` | `local-image` (default), `threejs` | Futuros: `rive`, `live2d`, `liveavatar` → fallback a `local-image` |
| `NEXT_PUBLIC_TTS_PROVIDER` | `web-speech`, `none` | `external` → fallback a `web-speech` |
| `NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT` | `true` / `false` | Solo sin preferencia previa |

Validación y fallbacks: `src/lib/assistant/assistantExperienceConfig.ts`.

Las variables `NEXT_PUBLIC_*` se resuelven en **build time** de Next.js.

---

## Proveedor 3D experimental

Estado: **estable para uso experimental**. El default del proyecto sigue siendo `local-image`.

### Activar / desactivar

```bash
# Activar 3D (en .env.local; reiniciar npm run dev)
NEXT_PUBLIC_AVATAR_PROVIDER=threejs

# Volver a imágenes locales
NEXT_PUBLIC_AVATAR_PROVIDER=local-image
```

En `.env.example` el valor por defecto es `local-image`.

### Rutas del modelo

| Ubicación | Ruta |
|-----------|------|
| Disco | `public/models/avatar/avatar-tescha.glb` |
| URL pública | `/models/avatar/avatar-tescha.glb` |

### Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/lib/avatar/avatar3DConfig.ts` | Path, scale, position, rotation, camera, luces, orbit/auto-reset, mapeo de clips |
| `src/components/avatar/Avatar3DPanel.tsx` | Canvas R3F + escenario |
| `src/components/avatar/Avatar3DModel.tsx` | GLB + animaciones |
| `src/components/avatar/Avatar3DOrbitControls.tsx` | Órbita + auto-reset suave |
| `src/components/AgentDock.tsx` | Selector de provider + fallback |

Carga: `dynamic(..., { ssr: false })` tras `mounted` (hidratación segura). El chunk 3D **no** se descarga con `local-image`.

### Animaciones esperadas en el GLB

`idle`, `thinking`, `speaking`, `happy`, `error`, `listening`, `greeting`, `explain`, `nod`, `wave`

### Mapeo `AvatarState` → clip

| Estado | Animación |
|--------|-----------|
| idle | idle |
| thinking | thinking |
| speaking | speaking |
| happy | happy |
| error | error |
| listening | listening |

Auxiliares (aún no mapeados a estados): `greeting`, `explain`, `nod`, `wave`.  
Si falta un clip → fallback a `idle` (o al primer clip disponible).

### Calibración visual (avatar3DConfig.ts)

| Constante | Efecto |
|-----------|--------|
| `AVATAR_3D_MODEL_POSITION` | Posición `[x, y, z]` — **Y** sube/baja el modelo |
| `AVATAR_3D_MODEL_SCALE` | Tamaño |
| `AVATAR_3D_MODEL_ROTATION` | Orientación (`[0, Math.PI, 0]` si mira de espalda) |
| `AVATAR_3D_CAMERA_POSITION` / `FOV` / `TARGET` | Encuadre |
| `AVATAR_3D_AUTO_RESET_DELAY_MS` | Delay (ms) sin interacción antes de volver al frente (default `4000`) |

### Interacción

- Desktop: el usuario puede rotar el avatar (OrbitControls).
- Tras ~4 s sin interacción → cámara vuelve suavemente a la vista frontal.
- Mobile (&lt; 640px): órbita desactivada para no interferir con el scroll.
- El auto-reset **no** cambia `avatarState` ni afecta voz/chat.

### Fallback

Si WebGL o el GLB fallan, `AgentDock` vuelve a `AvatarPanel` (`local-image`) sin romper el chat. El usuario ve el avatar 2D; en development se registra `console.error`.

No hay lip-sync real.

---

## J. Escalabilidad futura

Integraciones tipadas pero **no implementadas**:

- Rive / Live2D
- LiveAvatar / HeyGen
- TTS externo (ElevenLabs, Azure, OpenAI, etc.)

---

## K. Limitaciones actuales

- Sin lip-sync real.
- TTS depende del navegador/SO.
- Safari móvil puede limitar Web Speech.
- `NEXT_PUBLIC_*` se fija en arranque/build de Next.
- El GLB debe incluir los clips esperados con esos nombres.

---

## L. Checklist de pruebas manuales

### Avatar 2D / default

- [ ] Con `NEXT_PUBLIC_AVATAR_PROVIDER=local-image` (o sin variable) se muestran imágenes
- [ ] No se descarga el chunk Three.js en Network

### Avatar 3D

- [ ] Con `NEXT_PUBLIC_AVATAR_PROVIDER=threejs` se carga el GLB
- [ ] Estados: idle / thinking / speaking / happy / error / listening
- [ ] Rotación manual (desktop) + auto-reset (~4 s) a vista frontal
- [ ] Mobile: scroll del chat usable; órbita no bloquea
- [ ] Sin GLB o WebGL roto → fallback a local-image sin romper el chat

### Voz y chat

- [ ] Voz apagada: thinking → speaking → happy → idle
- [ ] Voz encendida: speaking durante TTS → happy → idle
- [ ] Botón **Detener** cancela lectura y va a happy
- [ ] Nueva pregunta mientras habla → thinking y cancela TTS
- [ ] Error de API → error → idle
- [ ] Preferencias de voz persisten en localStorage tras recargar

---

## Referencias rápidas

- Config experiencia: `src/lib/assistant/assistantExperienceConfig.ts`
- Estados visuales (2D): `src/lib/avatar/avatarConfig.ts`
- Config 3D: `src/lib/avatar/avatar3DConfig.ts`
- Controlador: `src/lib/avatar/useAvatarController.ts`
- TTS: `src/lib/speech/useSpeechSynthesis.ts`
- Ejemplo env: `.env.example`
