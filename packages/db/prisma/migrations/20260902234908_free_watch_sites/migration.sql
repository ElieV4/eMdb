-- CreateTable
CREATE TABLE "free_watch_sites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" TEXT NOT NULL,
    "url_recherche" TEXT NOT NULL,
    "url_directe" TEXT,
    "selecteur_resultat" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "free_watch_sites_pkey" PRIMARY KEY ("id")
);

