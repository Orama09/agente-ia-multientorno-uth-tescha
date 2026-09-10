# Dockerfile (desarrollo)
FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# Variables de servicio (sobrescritas por docker-compose en runtime)
ENV CHROMA_URL=http://chroma:8000
ENV CHROMA_COLLECTION_NAME=school_documents

CMD ["npm", "run", "dev"]