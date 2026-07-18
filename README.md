# 🤖 AI Avatar - Agente IA Multientorno UTH y TESCHA

Proyecto desarrollado por parte del Tecnológico de Estudios Superiores de Chalco (TESCHA) en colaboración con la Universidad Tecnológica de Honduras (UTH). 

Este sistema implementa un asistente inteligente con interfaz web que permite interactuar con un modelo de inteligencia artificial mediante una experiencia conversacional, utilizando tecnologías modernas.

---

# 📌 Descripción

AI Avatar es una aplicación web desarrollada con Next.js que permite a los usuarios conversar con un asistente virtual impulsado por un modelo de lenguaje local.

El proyecto integra una interfaz moderna, procesamiento de documentos mediante RAG (Retrieval-Augmented Generation) y ejecución del modelo mediante un modelo de inteligencia artificial.

---

# ✨ Características

- 💬 Chat con Inteligencia Artificial.
- 🤖 Avatar interactivo.
- 📄 Soporte para documentos.
- 🧠 Integración con Ollama.
- 🔎 Implementación de RAG.
- 🎨 Interfaz desarrollada con Tailwind CSS.
- 🐳 Contenedorización mediante Docker.
- ⚡ Desarrollo con Next.js 15 y TypeScript.

---

# 🛠 Tecnologías utilizadas

| Tecnología | Descripción |
|------------|-------------|
| Next.js | Framework de React |
| React | Biblioteca para interfaces |
| TypeScript | Tipado estático |
| Tailwind CSS | Framework CSS |
| Docker | Contenedores |
| Ollama | Ejecución local del modelo IA |
| Node.js | Entorno de ejecución |
| npm | Administrador de paquetes |

---

# 📂 Estructura del proyecto

```
ai-avatar/
│
├── documents/
├── public/
├── scripts/
├── src/
│   ├── app/
│   ├── components/
│   └── lib/
│
├── .dockerignore
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── next-env.d.ts
├── next.config.cjs
├── package-lock.json
├── package.json
├── postcss.config.cjs
├── src.rar
├── tailwind.config.js
├── test.css
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
- Ollama

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

Edita `.env.local` si tus servicios no usan los puertos por defecto.

---

# 🔧 Variables de entorno

| Variable | Descripción | Local (`.env.local`) | Docker |
|----------|-------------|----------------------|--------|
| `OLLAMA_URL` | URL base de Ollama | `http://localhost:11434` | `http://ollama:11434` |
| `CHROMA_URL` | URL base de ChromaDB | `http://localhost:8000` | `http://chroma:8000` |
| `OLLAMA_GENERATION_MODEL` | Modelo de chat | `llama3.2:1b` (recomendado en CPU; `llama3` en equipos potentes) | mismo vía `.env` |
| `OLLAMA_EMBEDDING_MODEL` | Modelo de embeddings | `nomic-embed-text` | `nomic-embed-text` |
| `OLLAMA_KEEP_ALIVE` | Tiempo que Ollama mantiene el modelo en memoria | `30m` | `30m` |
| `RAG_MAX_DISTANCE` | Umbral L2 para chunks RAG (sin fallback ciego) | `280` | `280` |
| `CHROMA_COLLECTION_NAME` | Colección RAG | `school_documents` | `school_documents` |
| `NEXT_PUBLIC_AVATAR_PROVIDER` | Proveedor visual del avatar | `local-image` | `local-image` |
| `NEXT_PUBLIC_TTS_PROVIDER` | Proveedor de voz (TTS) | `web-speech` | `web-speech` |
| `NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT` | Voz activa al cargar | `false` | `false` |

La configuración de Ollama/Chroma vive en `src/lib/config.ts`.
La experiencia de avatar/voz vive en `src/lib/assistant/assistantExperienceConfig.ts`.

---

# 🎭 Avatar y voz

El dock del asistente usa un **avatar por estados** y **voz opcional** (Web Speech API).

| Variable | Default | Rol |
|----------|---------|-----|
| `NEXT_PUBLIC_AVATAR_PROVIDER` | `local-image` | Imágenes locales (default). Opcional: `threejs` |
| `NEXT_PUBLIC_TTS_PROVIDER` | `web-speech` | TTS (`none` oculta el botón de voz) |
| `NEXT_PUBLIC_VOICE_ENABLED_BY_DEFAULT` | `false` | Voz activa al cargar (si no hay preferencia en localStorage) |

**Proveedor 3D experimental:** pon `NEXT_PUBLIC_AVATAR_PROVIDER=threejs` en `.env.local` (modelo en `public/models/avatar/avatar-tescha.glb`) y reinicia el servidor. Para volver a imágenes: `local-image`.

Documentación técnica (mapeo de estados, calibración, auto-reset, checklist):

→ **[docs/avatar-voice.md](docs/avatar-voice.md)**

---

# ▶️ Ejecutar sin Docker

Requisitos adicionales en local:

1. Ollama en ejecución (`ollama serve`)
2. ChromaDB en el puerto 8000 (p. ej. solo el servicio `chroma` de Docker, o una instancia local)
3. Modelos descargados: `llama3.2:1b` (o `llama3`) y `nomic-embed-text`
4. Archivo `.env.local` creado desde `.env.example`

Indexar documentos (opcional, primera vez):

```bash
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

Levanta el contenedor

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

Docker Compose inyecta automáticamente las URLs internas (`ollama`, `chroma`) y descarga los modelos configurados al iniciar el contenedor de Ollama.

Indexar documentos dentro del contenedor Next.js (primera vez o tras agregar PDFs):

```bash
docker compose exec nextjs npm run index-docs
```

Puedes sobrescribir variables creando un archivo `.env` en la raíz del proyecto (Docker Compose lo lee al levantar los servicios).

---

# 🤖 Ollama

En desarrollo local, verifica que Ollama esté activo:

```bash
ollama serve
ollama pull llama3.2:1b
ollama pull nomic-embed-text
# Opcional en equipos potentes:
# ollama pull llama3
```

Los nombres de modelo deben coincidir con `OLLAMA_GENERATION_MODEL` y `OLLAMA_EMBEDDING_MODEL` en tu `.env.local`. Para menos latencia en CPU local, usa `llama3.2:1b` y `OLLAMA_KEEP_ALIVE=30m`.

---

# 👩‍💻 Autoras

**Elia Samantha Romero Rosas**

**Angélica Rubí Amaro Téllez**

Tecnológico de Estudios Superiores de Chalco

Ingeniería Informática

---

# 📄 Licencia

Proyecto desarrollado con fines académicos.
