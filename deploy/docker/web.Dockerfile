# Painel Next.js (standalone). Contexto: raiz do repositório.
# NEXT_PUBLIC_API_URL vazio = o browser chama /api na mesma origem (Caddy).
FROM node:20-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/types packages/types
RUN npm ci
COPY apps/web apps/web
COPY packages/types packages/types
RUN npm run build --workspace=apps/web

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
