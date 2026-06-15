# 1. Etapa de Construcción (Builder)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2. Etapa de Producción (Runner)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
# Copiamos carpeta de uploads por defecto
RUN mkdir -p uploads

EXPOSE 3001
ENV NODE_ENV=production

CMD ["node", "dist/src/main"]
