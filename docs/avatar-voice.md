# Módulo Avatar y Voz

Documentación técnica del módulo de experiencia del asistente (avatar 3D + TTS) en **AI Avatar**.

Público objetivo: desarrolladores que mantengan o extiendan el dock del asistente.

---

## A. Descripción general

El avatar funciona por **estados** (`AvatarState`). El chat no conoce el motor 3D directamente: solo emite estados. Un controlador central (`useAvatarController`) aplica timings y anti-carreras; el renderer 3D decide cómo mostrarlos.

| Capa | Implementación actual |
|------|------------------------|
| Visual | GLB Three.js (`threejs`) en `public/models/avatar/tescha_avatar_final.glb`, con animaciones nombradas por estado |
| Voz (TTS) | Web Speech API del navegador (`web-speech`), opcional y desactivada por defecto |

La arquitectura admite proveedores futuros (Rive, Live2D, LiveAvatar, TTS externo) sin reescribir el flujo del chat.

---

## B. Arquitectura general

```
ChatPanel
  ├── emite AvatarState vía onAvatarStateChange
  ├── controla TTS vía useSpeechSynthesis
  └── renderiza SpeechControls (si voz activa)

AgentDock
  ├── posee useAvatarController (dueño del estado)
  └── Avatar3DPanel (renderer 3D)

Avatar3DPanel (threejs)
  └── GLB + clips vía avatar3DConfig (dynamic, sin SSR)

useAvatarController.ts
  └── estados, timeouts, generation id, anti-carreras

assistantExperienceConfig.ts
  └── NEXT_PUBLIC_* → ttsProvider / voiceEnabledByDefault
```

Contrato clave: **ChatPanel emite estados; AgentDock orquesta; el panel solo renderiza**.

Archivos principales:

| Archivo | Rol |
|---------|-----|
| `src/types/avatar.ts` | `AvatarState` y helpers |
| `src/types/assistantExperience.ts` | Tipos de proveedores |
| `src/lib/assistant/assistantExperienceConfig.ts` | Resolución de env |
| `src/lib/avatar/avatar3DConfig.ts` | Path, scale, position, rotation, cámara, luces, orbit/auto-reset, mapeo de clips |
| `src/lib/avatar/useAvatarController.ts` | Sincronización |
| `src/lib/speech/useSpeechSynthesis.ts` | TTS Web Speech |
| `src/lib/speech/sanitizeSpeechText.ts` | Limpieza de texto |
| `src/lib/speech/speechStorage.ts` | Preferencias localStorage |
| `src/components/AgentDock.tsx` | Orquestación |
| `src/components/avatar/Avatar3DPanel.tsx` | Canvas R3F + escenario |
| `src/components/avatar/Avatar3DModel.tsx` | GLB + animaciones |
| `src/components/avatar/Avatar3DOrbitControls.tsx` | Órbita + auto-reset suave |
| `src/components/ChatPanel.tsx` | Chat + emisión de estados |
| `src/components/SpeechControls.tsx` | UI de voz |

---

## C. Estados del avatar

Definidos en `src/types/avatar.ts` y mapeados a clips de animación en `avatar3DConfig.ts`.

| Estado | Cuándo se activa | Representa |
|--------|------------------|------------|
| `idle` | Inicio; tras happy/error; fin de mic | Listo |
| `thinking` | Usuario envía mensaje o sube archivo | Analizando |
| `speaking` | Primer contenido real del stream; se mantiene durante TTS | Respondiendo |
| `happy` | Respuesta OK (y fin de TTS si voz on) | Consulta atendida |
| `error` | Fallo HTTP/stream/respuesta vacía | Problema |
| `listening` | Micrófono de dictado activo | Escuchando |

Timings del controlador (`useAvatarController.ts` / constantes en `avatar3DConfig.ts`):

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

## F. Configuración de voz

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

## G. localStorage

| Clave | Contenido |
|-------|-----------|
| `ai-avatar.voice.enabled` | `true` / `false` |
| `ai-avatar.voice.uri` | `voiceURI` seleccionada |
| `ai-avatar.voice.rate` | `0.8` / `1` / `1.2` |

`NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT` **solo** aplica si aún no existe `ai-avatar.voice.enabled`. Tras la primera elección del usuario, prevalece localStorage.

---

## H. Variables de entorno

Definidas en `.env.example` / `.env.local`:

```bash
NEXT_PUBLIC_AVATAR_PROVIDER=threejs
NEXT_PUBLIC_TTS_PROVIDER=web-speech
NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT=false
```

| Variable | Valores implementados | Notas |
|----------|----------------------|--------|
| `NEXT_PUBLIC_AVATAR_PROVIDER` | `threejs` (único implementado) | Futuros: `rive`, `live2d`, `liveavatar` |
| `NEXT_PUBLIC_TTS_PROVIDER` | `web-speech`, `none` | `external` → fallback a `web-speech` |
| `NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT` | `true` / `false` | Solo sin preferencia previa |

Validación y fallbacks: `src/lib/assistant/assistantExperienceConfig.ts`.

Las variables `NEXT_PUBLIC_*` se resuelven en **build time** de Next.js.

---

## I. Avatar 3D

### Rutas del modelo

| Ubicación | Ruta |
|-----------|------|
| Disco | `public/models/avatar/tescha_avatar_final.glb` |
| URL pública | `/models/avatar/tescha_avatar_final.glb` |

Carga: `dynamic(..., { ssr: false })` tras `mounted` (hidratación segura).

### Animaciones del GLB

El modelo actual incluye clips nombrados para cada estado: `idle`, `thinking`, `speaking`, `happy`, `error`, `listening`.

Auxiliares (aún no mapeados a estados): `greeting`, `explain`, `nod`, `wave`.

### Mapeo `AvatarState` → clip

| Estado | Animación |
|--------|-----------|
| idle | idle |
| thinking | thinking |
| speaking | speaking |
| happy | happy |
| error | error |
| listening | listening |

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

### Comportamiento si WebGL/GLB fallan

Ya no existe un proveedor de respaldo automático (`local-image` fue eliminado). El manejo de errores ahora es el siguiente:

1. `Avatar3DPanel` envuelve el `Canvas` en un **error boundary** (`Avatar3DErrorBoundary`). Si algo falla al renderizar el modelo 3D (WebGL no disponible, GLB corrupto, etc.), el boundary captura el error, lo reporta con `console.error` en desarrollo, y dispara el callback `onFatalError`.
2. `AgentDock` recibe ese `onFatalError` a través de `AvatarExperienceRenderer` y cambia su estado interno `hasFatalError` a `true`.
3. En el siguiente render, `AvatarExperienceRenderer` **deja de montar `Avatar3DPanel` por completo** y en su lugar muestra un mensaje fijo: *"El avatar no está disponible en este momento."*, sobre un fondo de color sólido, sin el canvas 3D.
4. **El chat no se ve afectado**: `ChatPanel` vive fuera de `AvatarExperienceRenderer`, en su propio contenedor dentro de `AgentDock`, así que sigue funcionando con normalidad aunque el avatar falle.

En resumen: no hay pantalla en blanco ni crash de la app — el avatar se reemplaza por un mensaje de "no disponible" y el usuario puede seguir usando el chat y el módulo de trámites sin problema.

No hay lip-sync real.

---

## J. Escalabilidad futura

Integraciones tipadas pero **no implementadas**:

- Rive / Live2D
- LiveAvatar
- TTS externo (ElevenLabs, Azure, OpenAI, etc.)

---

## K. Limitaciones actuales

- Sin lip-sync real.
- TTS depende del navegador/SO.
- Safari móvil puede limitar Web Speech.
- `NEXT_PUBLIC_*` se fija en arranque/build de Next.
- El GLB debe incluir los clips esperados con esos nombres.
- Sin proveedor de respaldo visual si WebGL o el GLB fallan: se reemplaza por un mensaje de texto, pero el chat sigue funcionando.

---

## L. Checklist de pruebas manuales

### Avatar 3D

- [ ] Se carga el GLB correctamente
- [ ] Estados: idle / thinking / speaking / happy / error / listening
- [ ] Rotación manual (desktop) + auto-reset (~4 s) a vista frontal
- [ ] Mobile: scroll del chat usable; órbita no bloquea
- [ ] Si no hay GLB o WebGL falla: aparece el mensaje "El avatar no está disponible en este momento" y el chat sigue usable

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
- Config 3D: `src/lib/avatar/avatar3DConfig.ts`
- Controlador: `src/lib/avatar/useAvatarController.ts`
- TTS: `src/lib/speech/useSpeechSynthesis.ts`
- Ejemplo env: `.env.example`
