# Dockerfile (desarrollo)
FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# Variables de servicio (sobrescritas por docker-compose en runtime)
ENV OLLAMA_URL=http://ollama:11434
ENV CHROMA_URL=http://chroma:8000
ENV OLLAMA_GENERATION_MODEL=llama3
ENV OLLAMA_EMBEDDING_MODEL=nomic-embed-text
ENV CHROMA_COLLECTION_NAME=school_documents

CMD ["npm", "run", "dev"]