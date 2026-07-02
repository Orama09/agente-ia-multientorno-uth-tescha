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

---

# ▶️ Ejecutar sin Docker

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

---

# 🤖 Ollama

Antes de ejecutar el proyecto verifica que Ollama esté activo.

Ejemplo:

```bash
ollama serve
```

Y descarga el modelo que utilices.

Por ejemplo:

```bash
ollama pull llama3
```

---

# 👩‍💻 Autoras

**Elia Samantha Romero Rosas**

**Angélica Rubí Amaro Téllez**

Tecnológico de Estudios Superiores de Chalco

Ingeniería Informática

---

# 📄 Licencia

Proyecto desarrollado con fines académicos.
