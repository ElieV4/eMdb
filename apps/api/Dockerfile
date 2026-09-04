# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

# Installer les dépendances système pour Prisma + Python pour dbt
# (packages/dbt-analytics) : en prod cloud, le worker (dbt inclus) tourne
# comme process enfant de ce même service (EMBED_WORKER=true, cf.
# wiki/Déploiement), donc l'image api en a besoin aussi.
RUN apk add --no-cache openssl libstdc++ python3 py3-pip

# Copie des manifests pour profiter du cache Docker sur l'install
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json

RUN npm install --workspaces --if-present

# Copie du reste du monorepo (utile en build ; en dev, volumes montés par compose)
COPY . .

# dbt dans un virtualenv dédié (pas de pip global sur l'image, cf. PEP 668).
RUN python3 -m venv /opt/dbt-venv && \
    /opt/dbt-venv/bin/pip install --no-cache-dir -r packages/dbt-analytics/requirements.txt
ENV DBT_BIN=/opt/dbt-venv/bin/dbt

# Générer le client Prisma
RUN cd /app/packages/db && npx prisma generate --schema=./prisma/schema.prisma

# Compiler packages/db
RUN cd /app/packages/db && npx tsc --skipLibCheck

# Compiler packages/tmdb-client, tmdb-mapper, wikidata-client, tmdb-sync, recommender, push
RUN cd /app/packages/tmdb-client && npx tsc --skipLibCheck
RUN cd /app/packages/tmdb-mapper && npx tsc --skipLibCheck
RUN cd /app/packages/wikidata-client && npx tsc --skipLibCheck
RUN cd /app/packages/tmdb-sync && npx tsc --skipLibCheck
RUN cd /app/packages/recommender && npx tsc -p tsconfig.json
RUN cd /app/packages/push && npx tsc --skipLibCheck

# Créer des symlinks pour les packages dans node_modules
RUN mkdir -p /app/node_modules/@emdb && \
    ln -s /app/packages/db /app/node_modules/@emdb/db && \
    ln -s /app/packages/tmdb-client /app/node_modules/@emdb/tmdb-client && \
    ln -s /app/packages/tmdb-mapper /app/node_modules/@emdb/tmdb-mapper && \
    ln -s /app/packages/wikidata-client /app/node_modules/@emdb/wikidata-client && \
    ln -s /app/packages/tmdb-sync /app/node_modules/@emdb/tmdb-sync && \
    ln -s /app/packages/recommender /app/node_modules/@emdb/recommender && \
    ln -s /app/packages/push /app/node_modules/@emdb/push

# Build de prod de l'API (nest build). `nest start --watch` (mode dev, compilateur
# webpack incrémental) est bien trop gourmand en mémoire pour une instance à 512 Mo
# de RAM (ex. Render free) — OOM au démarrage constaté en pratique.
RUN cd /app/apps/api && npx nest build

WORKDIR /app/apps/api
EXPOSE 3001

CMD ["node", "dist/main"]
