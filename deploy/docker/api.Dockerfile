# API + worker. Contexto: raiz do repositório.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/types packages/types
RUN npm ci
COPY apps/api apps/api
COPY db db
RUN npm run build --workspace=apps/api

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/types packages/types
RUN npm ci --omit=dev
COPY --from=build /app/apps/api/dist apps/api/dist
COPY db db
COPY deploy/migrate-and-seed.sh /usr/local/bin/migrate-and-seed
RUN chmod +x /usr/local/bin/migrate-and-seed
WORKDIR /app/apps/api
USER node
EXPOSE 3001
CMD ["node", "dist/src/server.js"]
