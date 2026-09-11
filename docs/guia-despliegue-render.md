# Despliegue temporal en Render (demo de defensa de tesis)

Guía para publicar **AI Avatar TESCHA** en una URL pública gratuita, usando [Render](https://render.com). Pensada para una demo temporal (defensa), no para producción institucional permanente.

> ⚠️ Render **no ejecuta `docker-compose.yml` directamente**. Cada servicio se da de alta por separado. Esta guía traduce tu `docker-compose.yml` a 3 servicios de Render.

---

## A. Arquitectura del despliegue

| Servicio local (`docker-compose.yml`) | Equivalente en Render |
|----------------------------------------|------------------------|
| `nextjs` | Web Service (Docker, desde tu `Dockerfile`) |
| `chroma-multientorno` | Web Service (Docker, imagen `chromadb/chroma:latest`) |
| `postgres-multientorno` | **Postgres administrado de Render** (no un contenedor propio) |

Gemini y SendGrid siguen siendo APIs externas — no cambian.

---

## B. Antes de empezar

1. Tu código debe estar en un repositorio de **GitHub** (Render se conecta directo al repo).
2. Confirma que `.env` / `.env.local` estén en `.gitignore` (ya lo verificamos antes) — **nunca** subas tus API keys reales al repo.
3. Crea una cuenta en [render.com](https://render.com) (no pide tarjeta para el plan gratuito).

---

## C. Paso 1 — Crear el Postgres gratuito

1. En el dashboard de Render: **New +** → **PostgreSQL**.
2. Nombre: el que quieras (ej. `tescha-tramites-db`).
3. Plan: **Free**.
4. Crea la base. Render te dará automáticamente una **Internal Database URL** — cópiala, esa es tu `DATABASE_URL`.

⚠️ **Recuerda:** el Postgres gratis de Render **expira a los 30 días** de creado. Para una demo temporal está bien, pero si necesitas más tiempo, crea uno nuevo antes de que expire.

---

## D. Paso 2 — Desplegar ChromaDB

1. **New +** → **Web Service**.
2. Elige **"Deploy an existing image"** (no un repo de GitHub).
3. Imagen: `chromadb/chroma:latest`.
4. Puerto: `8000`.
5. Plan: **Free**.
6. Una vez creado, copia la **URL pública** que Render le asigna (algo como `https://tescha-chroma.onrender.com`) — la necesitarás como `CHROMA_URL` en el paso siguiente.

⚠️ **Limitación importante:** el plan gratis de Render **no incluye disco persistente**. Cada vez que este servicio se reinicie (por inactividad o por un redeploy), **pierde todo lo indexado** en ChromaDB. Ver sección G para cómo manejarlo.

---

## E. Paso 3 — Desplegar Next.js

1. **New +** → **Web Service**.
2. Conecta tu repositorio de GitHub (`agente-ia-multientorno-uth-tescha`).
3. Runtime: **Docker** (Render detecta tu `Dockerfile` en la raíz).
4. Plan: **Free**.
5. **Sobrescribe el comando de arranque.** Tu `Dockerfile` actual corre `npm run dev` (modo desarrollo — más lento y no pensado para producción). Además, el modelo 3D (`tescha_avatar_final.glb`) **no está en el repositorio** (pesa 144 MB, excede el límite de GitHub) — vive como adjunto en un [GitHub Release](https://github.com/Orama09/agente-ia-multientorno-uth-tescha/releases/tag/assets-v1) y hay que descargarlo antes de arrancar. En la configuración del Web Service, en **"Docker Command"** (o "Start Command", según la versión del dashboard), pon:

   ```bash
   sh -c "mkdir -p public/models/avatar && curl -L -o public/models/avatar/tescha_avatar_final.glb https://github.com/Orama09/agente-ia-multientorno-uth-tescha/releases/download/assets-v1/tescha_avatar_final.glb && npm run build && npm run start"
   ```

   Esto descarga el modelo, corre el build de producción y arranca — todo en un solo comando. `next start` respeta automáticamente la variable `PORT` que Render inyecta, así que no hay que tocar nada más de puertos.

   ⚠️ **Importante:** como este comando corre cada vez que el contenedor **arranca** (no solo la primera vez), cada vez que el servicio despierte de estar dormido (ver sección H) va a volver a descargar el archivo de 144 MB — esto añade tiempo al despertar, además del propio "cold start" de Render. Tenlo en cuenta al calcular cuánto antes de la demo necesitas "despertar" el servicio.

6. **Nota (no bloquea el despliegue):** tu `Dockerfile` trae `ENV OLLAMA_URL=http://ollama:11434`, resto de la época de Ollama. No rompe nada porque nada la usa ya, pero vale la pena quitarla cuando limpies el código muerto de Ollama en `config.ts`.

---

## F. Variables de entorno del servicio Next.js

En la sección **Environment** del Web Service de Next.js, agrega:

```env
NODE_ENV=production

# Gemini
GOOGLE_API_KEY=
GEMINI_API_KEY=

# ChromaDB (URL pública del servicio del Paso D)
CHROMA_URL=https://tescha-chroma.onrender.com
CHROMA_COLLECTION_NAME=school_documents
RAG_MAX_DISTANCE=0.8
RAG_DISTANCE_MARGIN=0.15

# Postgres (Internal Database URL del Paso C)
DATABASE_URL=

# Avatar / voz
NEXT_PUBLIC_AVATAR_PROVIDER=threejs
NEXT_PUBLIC_TTS_PROVIDER=web-speech
NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT=false

# Trámites
SENDGRID_API_KEY=
SENDGRID_TO_EMAIL=
ADMIN_KEY=
APP_BASE_URL=https://tescha-ai-avatar.onrender.com
```

`APP_BASE_URL` debe ser la URL pública que Render le asigna a **este mismo servicio** (Next.js) — Render te la muestra en cuanto lo creas, aunque el primer deploy falle; puedes actualizar esta variable después.

---

## G. Indexar documentos en producción

Como ChromaDB en Render no tiene disco persistente (ver sección D), necesitas indexar **después de cada despliegue o reinicio** de ese servicio, no una sola vez.

Render no tiene un equivalente directo a `docker compose exec`, así que la forma de correr los scripts de indexado es usar el **Shell** del servicio de Next.js (pestaña "Shell" en el dashboard del Web Service, disponible en planes con acceso a shell — revisa si tu plan free lo incluye; si no, la alternativa es correr los scripts desde tu propia computadora apuntando `CHROMA_URL` a la URL pública del Chroma de Render):

```bash
npm run scrape-docs
npm run index-docs
```

**Recomendación para el día de la defensa:** corre estos dos comandos **justo antes** de empezar, y evita que pase mucho tiempo de inactividad entre que indexas y haces la demo (ver siguiente sección sobre el "sleep" de los servicios gratis).

---

## H. Limitaciones a tener en cuenta para la demo en vivo

- **Spin-down por inactividad:** los servicios gratis de Render "duermen" tras ~15 minutos sin tráfico, y la siguiente visita tarda hasta ~1 minuto en responder mientras despierta. Esto aplica **tanto al servicio de Next.js como al de Chroma** — si cualquiera de los dos se duerme, hay que esperar a que despierte (y si fue Chroma el que se durmió, perdiste el índice y hay que re-indexar).
- **El modelo 3D se re-descarga en cada arranque** (ver sección E): al despertar de estar dormido, Next.js vuelve a bajar los 144 MB del `.glb` antes de poder arrancar — esto suma tiempo extra al "despertar" además del cold-start normal de Render.
- **Mitigación sugerida:** unos 10-15 minutos antes de tu defensa, abre la URL de la aplicación y haz una pregunta de prueba (esto despierta ambos servicios). Si tienes tiempo de espera antes de presentar, interactúa con la app cada pocos minutos para mantenerla despierta.
- **750 horas gratis al mes por workspace:** de sobra para una demo puntual, no es un límite que debas preocuparte para este caso.
- **Postgres expira a los 30 días:** si tu defensa es después de ese plazo, crea la base de nuevo (y actualiza `DATABASE_URL`) antes.

---

## I. Checklist antes de la defensa

- [ ] Postgres de Render creado y `DATABASE_URL` copiado a las variables de Next.js
- [ ] ChromaDB desplegado y su URL pública copiada como `CHROMA_URL`
- [ ] Next.js desplegado, build exitoso (revisar logs si falla)
- [ ] Todas las variables de la sección F configuradas (sin dejar ninguna vacía por error)
- [ ] `APP_BASE_URL` actualizado con la URL real que Render asignó a Next.js
- [ ] `scrape-docs` + `index-docs` corridos contra el Chroma de Render
- [ ] Probar una pregunta institucional real y confirmar que responde con contexto (no "información limitada")
- [ ] Probar el flujo de trámites completo (crear solicitud → revisar que llega el correo)
- [ ] 10-15 min antes de la demo: abrir la URL y "despertar" los servicios
