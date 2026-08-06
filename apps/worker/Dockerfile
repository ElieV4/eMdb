# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

# Dépendances système pour le moteur Prisma (cf. apps/api/Dockerfile).
RUN apk add --no-cache openssl libstdc++

COPY package.json package-lock.json* ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/db/package.json packages/db/package.json

RUN npm install --workspaces --if-present

COPY . .

# Génère le client Prisma dans l'image — packages/db est ensuite écrasé par
# le volume monté par docker-compose (source host, `dist/` inclus), mais
# node_modules/@prisma/client (ce que génère cette commande) reste propre à
# l'image (pas de volume host dessus) : sans ce step, le client Prisma
# packagé lors du `npm install` reste un squelette non initialisé
# ("@prisma/client did not initialize yet") et le worker crashe au premier
# accès DB.
RUN cd /app/packages/db && npx prisma generate --schema=./prisma/schema.prisma

WORKDIR /app/apps/worker

CMD ["npm", "run", "start:dev"]
