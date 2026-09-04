# eMDB

Application de tracking films/séries : fiches détaillées, suivi personnel (visionnages, notes, listes), recommandations, dataviz et notifications — en web (Next.js) et Android (Capacitor).

Monorepo TypeScript : API REST (NestJS), worker asynchrone (BullMQ/Redis), frontend (Next.js), packages partagés (client TMDB, mapping, sync, recommandation, client Wikidata).

📖 Documentation complète : **[Wiki](../../wiki)** — architecture, modules, déploiement.

## Fonctionnalités

- Recherche et fiches détaillées films/séries (casting, saisons/épisodes, titres similaires)
- Fiches personnes avec filmographie
- Visionnages, notation, listes personnalisées et partageables
- Suivi de séries avec calendrier des épisodes non vus
- Découverte : tendances, sorties à venir, sélections festivals & cérémonies
- Recommandations (algorithme de similarité maison, calcul batch asynchrone)
- Dataviz personnelle (temps de visionnage, nombre de films/épisodes, par genre/pays/période)
- Notifications (nouveaux épisodes, premières de saison) + push Android (FCM)

## Stack

| Couche | Techno |
| --- | --- |
| Frontend | Next.js + React + TypeScript, Tailwind CSS, TanStack Query, Zustand |
| Backend API | NestJS + TypeScript, Prisma/PostgreSQL |
| Worker | BullMQ + Redis |
| Mobile | Capacitor (wrapper Android) |
| Sources de données | TMDB, Wikidata |
| Hébergement | Vercel + Render + Supabase + Upstash (voir [Déploiement](../../wiki/Déploiement)) |

## Démarrage local

Prérequis : Node.js 20+, Docker.

```bash
cp .env.example .env   # renseigner TMDB_API_KEY au minimum
npm install
docker compose up -d   # PostgreSQL + Redis
npm run prisma:generate
npm run dev:api         # apps/api sur :3001
npm run dev:worker       # apps/worker
```

Le frontend (`apps/web`) se lance séparément avec `npm run dev --workspace=apps/web` (Next.js sur `:3000`).

## Structure

```
apps/
├── api/      # API REST NestJS
├── worker/   # Worker BullMQ
└── web/      # Frontend Next.js (+ wrapper Android)
packages/     # Client TMDB, mapping, sync, recommandation, client Wikidata, schéma DB
```

Détails : [wiki Architecture](../../wiki/Architecture).
