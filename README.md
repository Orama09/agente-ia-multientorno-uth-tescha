# 🤖 AI Avatar - Agente IA Multientorno TESCHA

Proyecto desarrollado por el Tecnológico de Estudios Superiores de Chalco (TESCHA), en colaboración con la Universidad Tecnológica de Honduras (UTH), como trabajo de titulación.

Este repositorio corresponde a la **versión específica de TESCHA**. El proyecto cuenta con una copia hermana para UTH, independiente en archivos y assets (logo y modelo 3D propios), pero con el mismo funcionamiento y arquitectura.

Este sistema implementa un asistente inteligente con interfaz web que permite interactuar con un modelo de inteligencia artificial mediante una experiencia conversacional con avatar 3D, voz y un módulo de trámites académicos, utilizando tecnologías modernas.

---

# 📌 Descripción

AI Avatar es una aplicación web desarrollada con **Next.js 14 (App Router)** que permite a los usuarios conversar con un asistente virtual institucional impulsado por **Gemini** (Google AI).

El proyecto integra una interfaz moderna, un avatar 3D con máquina de estados, síntesis de voz en el navegador, procesamiento de documentos institucionales mediante RAG (Retrieval-Augmented Generation) con base de datos vectorial, y un módulo de trámites académicos simulados de principio a fin.

---

# ✨ Características

- 💬 Chat con Inteligencia Artificial (Gemini), respondiendo solo con información institucional (RAG).
- 🧑‍🚀 Avatar interactivo 3D (Three.js / React Three Fiber).
- 🎙️ Entrada de voz tipo push-to-talk (Web Speech Recognition) y salida de voz con lectura progresiva (Web Speech API).
- 🔎 Implementación de RAG con base de datos vectorial (ChromaDB), base de datos relacional (PostgreSQL) y embeddings de Gemini.
- 📄 Módulo de trámites académicos: solicitud con folio, consulta de estatus y generación de comprobante en PDF.
- 📧 Notificación automática por correo (SendGrid) al enviar una solicitud de trámite.
- 📱 Interfaz responsive (adaptada a dispositivos móviles).
- 🎨 Interfaz desarrollada con Tailwind CSS.
- 🐳 Contenedorización mediante Docker (incluye base de datos PostgreSQL propia).
- ⚡ Desarrollo con Next.js 14 y TypeScript.

---

# 🛠 Tecnologías utilizadas

| Tecnología | Descripción |
|------------|-------------|
| Next.js 14 | Framework de React (App Router) |
| React | Biblioteca para interfaces |
| TypeScript | Tipado estático |
| Tailwind CSS | Framework CSS |
| Three.js / React Three Fiber / Drei | Renderizado y control del avatar 3D |
| Gemini (Google AI SDK) | Motor de generación de lenguaje |
| ChromaDB | Base de datos vectorial para RAG |
| Web Speech API | Reconocimiento y síntesis de voz en navegador |
| PostgreSQL | Base de datos del módulo de trámites |
| SendGrid | Envío de correos transaccionales |
| pdf-lib | Generación de comprobantes en PDF |
| Docker | Contenedores |
| Node.js | Entorno de ejecución |
| npm | Administrador de paquetes |

---

# 📂 Estructura del proyecto

```
agente-ia-multientorno-uth-tescha/
│
├── documents/                       # Documentos institucionales base (reglamentos, calendario, etc.)
├── public/
│   ├── documents/                   # Base de conocimiento para el RAG
│   └── models/avatar/               # Modelos .glb del avatar 3D
├── scripts/
│   ├── scrapeWebsites.ts            # Extracción de contenido de sitios institucionales
│   └── indexDocuments.ts            # Indexación de documentos hacia ChromaDB
├── src/
│   ├── app/
│   │   ├── acerca/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   └── tramites/[folio]/{accion, comprobante}/
│   │   ├── estudiantes/
│   │   └── oferta-academica/[slug]/
│   ├── components/
│   │   ├── avatar/{Avatar3DModel, Avatar3DOrbitControls, Avatar3DPanel}
│   │   ├── AgentDock/
│   │   ├── ChatPanel/
│   │   ├── Footer/
│   │   ├── Hero/
│   │   ├── Navbar/
│   │   ├── SpeechControls/
│   │   ├── SplashScreen/
│   │   └── TramitesModal/
│   ├── data/carreras.ts
│   ├── lib/
│   │   ├── assistant/assistantExperienceConfig.ts
│   │   ├── avatar/{avatar3DConfig, useAvatarController}
│   │   ├── speech/{sanitizeSpeechText, speechStorage, streamSpeechText, useSpeechSynthesis, useStreamingSpeechSynthesis}
│   │   ├── tramites/{db, mailer, store}
│   │   ├── config.ts
│   │   ├── institutionalReplies.ts
│   │   ├── loadEnv.ts
│   │   ├── performanceLog.ts
│   │   └── rag.ts
│   └── types/{assistantExperience, avatar, tramite}
│
├── docs/
│   └── avatar-voice.md              # Documentación técnica del avatar y la voz
│
├── .dockerignore
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── next-env.d.ts
├── next.config.cjs
├── package.json
├── postcss.config.cjs
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.scripts.json
└── README.md
```

---

# ⚙️ Requisitos

Antes de ejecutar el proyecto asegúrate de tener instalado:

- Node.js 20 o superior
- npm
- Docker Desktop
- Git
- Una API key de Google AI (Gemini)
- Una cuenta y API key de SendGrid (para el módulo de trámites)

---

# 🚀 Instalación

Clona el repositorio

```bash
git clone https://github.com/Orama09/agente-ia-multientorno-uth-tescha.git
```

Ingresa al proyecto

```bash
cd agente-ia-multientorno-uth-tescha
```

Instala las dependencias

```bash
npm install
```

Configura las variables de entorno (desarrollo local)

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus propias credenciales y valores.

---

# 🔧 Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `CHROMA_URL` | URL base de ChromaDB (sin `/api/v2`) |
| `RAG_MAX_DISTANCE` | Umbral de distancia (L2) para aceptar chunks del RAG, sobre vectores normalizados de Gemini (escala 0-2). Default: `0.8` |
| `RAG_DISTANCE_MARGIN` | Margen adicional respecto al mejor resultado, para evitar mezclar temas. Default: `0.15` |
| `CHROMA_COLLECTION_NAME` | Nombre de la colección vectorial en ChromaDB |
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | Credenciales de acceso al modelo Gemini (Google AI) |
| `ENABLE_PERFORMANCE_LOGS` | Activa/desactiva logs de rendimiento del chat/RAG en consola del servidor (opcional; on por defecto en desarrollo) |
| `NEXT_PUBLIC_AVATAR_PROVIDER` | Proveedor visual del avatar (`threejs`, modelo 3D) |
| `NEXT_PUBLIC_TTS_PROVIDER` | Proveedor de síntesis de voz (`web-speech` o `none`) |
| `NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT` | Si la voz inicia activada al cargar (solo aplica con `web-speech`) |
| `POSTGRES_USER` | Usuario de la base de datos PostgreSQL (contenedor `uth-postgres`) |
| `POSTGRES_PASSWORD` | Contraseña de la base de datos PostgreSQL |
| `POSTGRES_DB` | Nombre de la base de datos (`tramites`) |
| `SENDGRID_API_KEY` | API key de SendGrid para el envío de correos del módulo de trámites |
| `SENDGRID_TO_EMAIL` | Correo institucional que recibe las notificaciones de trámites |
| `ADMIN_KEY` | Clave de administración para acciones protegidas sobre trámites |
| `APP_BASE_URL` | URL base de la aplicación (usada en enlaces generados, ej. comprobantes) |

La configuración de Gemini/Chroma vive en `src/lib/config.ts`.
La experiencia de avatar/voz vive en `src/lib/assistant/assistantExperienceConfig.ts`.
La configuración del módulo de trámites vive en `src/lib/tramites/`.

---

# 🎭 Avatar y voz

El dock del asistente cuenta con un **sistema de estados internos** (`idle`, `thinking`, `speaking`, `happy`, `error`, `listening`) orquestado por `useAvatarController.ts`, que gobierna el comportamiento del avatar conforme avanza la conversación (tiempo mínimo de "pensando", duración del estado "contento", recuperación tras error, y protección contra condiciones de carrera entre estados). El avatar se renderiza como modelo 3D (Three.js / React Three Fiber).

**Voz:** opcional, mediante la Web Speech API nativa del navegador.

La entrada de voz es manual, tipo *push-to-talk* (botón de micrófono con Web Speech Recognition API); no hay detección automática de fin de habla (VAD).

Documentación técnica (mapeo de estados, calibración, checklist):

→ **[docs/avatar-voice.md](docs/avatar-voice.md)**

---

# 📄 Módulo de trámites

Simula el flujo de una solicitud de trámite académico de principio a fin (sin conexión al sistema escolar real):

1. El usuario llena un formulario (nombre, matrícula, tipo de trámite, descripción).
2. La solicitud se guarda en PostgreSQL, generando un **folio** único.
3. Se envía una notificación por correo mediante **SendGrid**.
4. El usuario puede consultar el estatus de su trámite por folio.
5. Se genera un **comprobante en PDF** (con `pdf-lib`) al completar el trámite.

---

# ▶️ Ejecutar sin Docker

Requisitos adicionales en local:

1. Una instancia de ChromaDB en el puerto 8000 (p. ej. solo el servicio `chroma` de Docker, o una instancia local).
2. Una instancia de PostgreSQL accesible, con la variable `DATABASE_URL` definida a mano en tu `.env.local` (en Docker esta variable se arma automáticamente desde `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`; fuera de Docker no existe por defecto).
3. Archivo `.env.local` creado desde `.env.example`, con tus API keys de Gemini y SendGrid.

Indexar documentos institucionales (primera vez, o tras actualizar el contenido institucional o agregar documentos nuevos):

```bash
# 1. Extraer contenido actualizado del sitio institucional
npm run scrape-docs

# 2. Indexar documentos (institucionales + los de public/documents) hacia ChromaDB
npm run index-docs
```

Inicia el servidor de desarrollo

```bash
npm run dev
```

Abre el navegador en:

```
http://localhost:3000
```

---

# 🐳 Ejecutar con Docker

Construye la imagen

```bash
docker compose build
```

Levanta los contenedores (incluye la app, ChromaDB y PostgreSQL)

```bash
docker compose up
```

o en segundo plano

```bash
docker compose up -d
```

La aplicación estará disponible en:

```
http://localhost:3000
```

Docker Compose inyecta automáticamente las URLs internas de los servicios (ChromaDB, PostgreSQL) definidos en `docker-compose.yml`; las demás variables (Gemini, SendGrid, avatar/voz, etc.) deben definirse igualmente en tu `.env`.

Indexar documentos dentro del contenedor Next.js (primera vez, o tras actualizar el contenido institucional o agregar documentos nuevos):

```bash
# 1. Extraer contenido actualizado del sitio institucional
docker compose exec nextjs npm run scrape-docs

# 2. Indexar documentos hacia ChromaDB
docker compose exec nextjs npm run index-docs
```

Puedes sobrescribir variables creando un archivo `.env` en la raíz del proyecto (Docker Compose lo lee al levantar los servicios).

---

# 👩‍💻 Autoras

**Elia Samantha Romero Rosas**

**Angélica Rubí Amaro Téllez**

Tecnológico de Estudios Superiores de Chalco en colaboración con la Universidad Tecnologica de Honduras

Ingeniería Informática



---

# 📄 Licencia

Proyecto desarrollado con fines académicos.
