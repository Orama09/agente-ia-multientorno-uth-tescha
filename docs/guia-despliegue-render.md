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

1. Tu código debe estar en un repositorio de **GitHub** (Render se conecta directo al repo). Como UTH todavía no tiene uno, créalo primero (repositorio vacío o con el proyecto ya subido).
2. Confirma que `.env` / `.env.local` estén en `.gitignore` — **nunca** subas tus API keys reales al repo.
3. Crea una cuenta en [render.com](https://render.com) (no pide tarjeta para el plan gratuito).
4. Debes tener listo `Dockerfile.render` en la raíz del repo (ver [`docs/`](.) o el archivo que te compartí aparte) y el `.glb` de UTH subido como **GitHub Release** (ver sección E).

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
4. Nombre: `tescha-chroma`
5. Región: la misma que uses para los demás servicios
5. Plan: **Free**.
6. Una vez creado, copia la **URL pública** que Render le asigna (algo como `https://tescha-chroma.onrender.com`) — la necesitarás como `CHROMA_URL` en el paso siguiente.

⚠️ **Limitación importante:** el plan gratis de Render **no incluye disco persistente**. Cada vez que este servicio se reinicie (por inactividad o por un redeploy), **pierde todo lo indexado** en ChromaDB. Ver sección G para cómo manejarlo.

---

## E. Paso 3 — Subir el modelo 3D como GitHub Release

Como `tescha_avatar_final_animado.glb` probablemente pese más de 100 MB (el límite de GitHub para archivos normales del repo), **no se sube al repositorio directamente**. Se sube como adjunto de un Release:

1. En tu repositorio de GitHub (una vez creado): `https://github.com/<tu-usuario>/<repo-uth>/releases/new`
2. Tag: `assets-v1`. Título: "Avatar 3D model".
3. Arrastra `tescha_avatar_final_animado.glb` a la zona de adjuntos y publica.
4. Copia el enlace de descarga directa (algo como `https://github.com/<tu-usuario>/<repo-uth>/releases/download/assets-v1/tescha_avatar_final_animado.glb`).

---
## F. Paso 4 — Desplegar Next.js (con `Dockerfile.render`)

1. **New +** → **Web Service**.
2. Conecta tu repositorio de GitHub de UTH.
3. Runtime: **Docker** (Render detecta el Dockerfile).
4. **Importante:** en el campo **"Dockerfile Path"**, cambia el valor de `./Dockerfile` a **`./Dockerfile.render`**.
5. Deja el campo **"Docker Command"** completamente **vacío** — el `CMD` ya vive dentro de `Dockerfile.render`, no hace falta sobrescribirlo.
6. Plan: **Free**.

`Dockerfile.render` (crear en la raíz del repo, junto al `Dockerfile` de desarrollo — no se toca ese, se deja igual):

```dockerfile
FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Descargar el modelo 3D (no está en el repo por su tamaño) — se hace aquí,
# en el build, para no repetirlo cada vez que el contenedor despierte
RUN mkdir -p public/models/avatar && \
    curl -L -o public/models/avatar/tescha_avatar_final_animado.glb https://github.com/<tu-usuario>/<repo-uth>/releases/download/assets-v1/tescha_avatar_final_animado.glb

# Build de producción — corre en la máquina de build de Render (hasta 8GB), no en el contenedor final
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]
```

⚠️ **Por qué así y no con un solo comando `sh -c "... && ... && ..."`:** lo intentamos primero así en la copia de TESCHA y falló dos veces:
- El campo "Docker Command" de Render no maneja bien las comillas ni el `&&` (interpreta todo el texto como un solo comando inválido).
- Incluso arreglando eso, el plan gratis de Render solo da **512 MB de RAM al contenedor en ejecución** — y `npm run build` puede quedarse sin memoria ahí. Las **máquinas de build** de Render sí tienen hasta 8 GB, así que mover el build al `Dockerfile` (que se ejecuta durante el build, no al arrancar) evita ambos problemas.
- Bono: con esto, el modelo 3D queda "horneado" en la imagen — ya no se re-descarga cada vez que el servicio despierta de estar dormido (solo en un redeploy nuevo).

---

## G. Variables de entorno del servicio Next.js

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
SENDGRID_FROM_EMAIL=
SENDGRID_TO_EMAIL=
ADMIN_KEY=
APP_BASE_URL=https://tescha-ai-avatar.onrender.com
```

`APP_BASE_URL` debe ser la URL pública que Render le asigna a **este mismo servicio** — te la muestra en cuanto lo creas, aunque el primer deploy falle; puedes actualizar esta variable después (dispara un redeploy pequeño y rápido, no vuelve a descargar el `.glb` porque eso vive en la imagen ya construida).
---

## H. Indexar documentos en producción

Como ChromaDB en Render no tiene disco persistente, necesitas indexar **después de cada despliegue o reinicio** de ese servicio, no una sola vez.

Si tu plan no incluye pestaña "Shell" en el servicio de Next.js, corre los scripts desde tu propia computadora, cambiando temporalmente `CHROMA_URL` en tu `.env.local` a la URL pública del Chroma de Render:

```bash
npm run scrape-docs
npm run index-docs
```

Después, regresa `CHROMA_URL` a `http://localhost:8000` en tu `.env.local` para no romper tu entorno de desarrollo.

**Recomendación para el día de la defensa:** corre estos dos comandos **justo antes** de empezar.


---

## I. Limitaciones a tener en cuenta para la demo en vivo

- **Spin-down por inactividad:** los servicios gratis de Render "duermen" tras ~15 minutos sin tráfico, y la siguiente visita tarda hasta ~1 minuto en responder mientras despierta. Esto aplica **tanto al servicio de Next.js como al de Chroma** — si cualquiera de los dos se duerme, hay que esperar a que despierte (y si fue Chroma el que se durmió, perdiste el índice y hay que re-indexar).
- **El modelo 3D se re-descarga en cada arranque** (ver sección E): al despertar de estar dormido, Next.js vuelve a bajar los 144 MB del `.glb` antes de poder arrancar — esto suma tiempo extra al "despertar" además del cold-start normal de Render.
- **Mitigación sugerida:** unos 10-15 minutos antes de tu defensa, abre la URL de la aplicación y haz una pregunta de prueba (esto despierta ambos servicios). Si tienes tiempo de espera antes de presentar, interactúa con la app cada pocos minutos para mantenerla despierta.
- **750 horas gratis al mes por workspace:** de sobra para una demo puntual, no es un límite que debas preocuparte para este caso.
- **Postgres expira a los 30 días:** si tu defensa es después de ese plazo, crea la base de nuevo (y actualiza `DATABASE_URL`) antes.

---

## J. Checklist antes de la defensa

- [ ] Repositorio de TESCHA creado en GitHub y código subido
- [ ] `.glb` de TESCHA subido como GitHub Release, enlace de descarga confirmado
- [ ] `Dockerfile.render` en la raíz del repo, con la URL correcta del Release
- [ ] Postgres de Render creado y `DATABASE_URL` copiado a las variables de Next.js
- [ ] ChromaDB desplegado y su URL pública copiada como `CHROMA_URL`
- [ ] Next.js desplegado, build exitoso (revisar logs si falla)
- [ ] Todas las variables de la sección G configuradas (sin dejar ninguna vacía por error)
- [ ] `APP_BASE_URL` actualizado con la URL real que Render asignó a Next.js
- [ ] `scrape-docs` + `index-docs` corridos contra el Chroma de Render
- [ ] Probar una pregunta institucional real y confirmar que responde con contexto (no "información limitada")
- [ ] Probar el flujo de trámites completo (crear solicitud → revisar que llega el correo)
- [ ] 10-15 min antes de la demo: abrir la URL y "despertar" los servicios
