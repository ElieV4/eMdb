-- Extension requise pour gen_random_uuid() (defaults des cles primaires)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE "countries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" CHAR(2) NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "episode_id" UUID,
    "role_id" UUID NOT NULL,
    "personnage" TEXT,
    "ordre" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'tmdb',

    CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "season_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "titre" TEXT,
    "synopsis" TEXT,
    "date_sortie" DATE,
    "duree_minutes" INTEGER,
    "image_url" TEXT,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" TEXT NOT NULL,
    "tmdb_id" INTEGER,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_items" (
    "list_id" UUID NOT NULL,
    "title_id" UUID NOT NULL,
    "position" INTEGER,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_items_pkey" PRIMARY KEY ("list_id","title_id")
);

-- CreateTable
CREATE TABLE "list_shares" (
    "list_id" UUID NOT NULL,
    "shared_with_user_id" UUID NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'lecture',
    "shared_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_shares_pkey" PRIMARY KEY ("list_id","shared_with_user_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "episode_id" UUID,
    "type" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tmdb_id" INTEGER,
    "nom" TEXT NOT NULL,
    "genre" TEXT,
    "date_naissance" DATE,
    "pays_id" UUID,
    "photo_url" TEXT,
    "bio" TEXT,
    "wiki_url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'tmdb',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_recommendations" (
    "person_id" UUID NOT NULL,
    "recommended_id" UUID NOT NULL,
    "score" DECIMAL(5,4) NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_recommendations_pkey" PRIMARY KEY ("person_id","recommended_id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "titre" TEXT,
    "date_sortie" DATE,
    "synopsis" TEXT,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "title_countries" (
    "title_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,

    CONSTRAINT "title_countries_pkey" PRIMARY KEY ("title_id","country_id")
);

-- CreateTable
CREATE TABLE "title_genres" (
    "title_id" UUID NOT NULL,
    "genre_id" UUID NOT NULL,

    CONSTRAINT "title_genres_pkey" PRIMARY KEY ("title_id","genre_id")
);

-- CreateTable
CREATE TABLE "title_recommendations" (
    "title_id" UUID NOT NULL,
    "recommended_id" UUID NOT NULL,
    "score" DECIMAL(5,4) NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "title_recommendations_pkey" PRIMARY KEY ("title_id","recommended_id")
);

-- CreateTable
CREATE TABLE "titles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tmdb_id" INTEGER,
    "type" TEXT NOT NULL,
    "titre_vo" TEXT NOT NULL,
    "titre_vf" TEXT,
    "synopsis" TEXT,
    "affiche_url" TEXT,
    "date_sortie" DATE,
    "duree_minutes" INTEGER,
    "statut_serie" TEXT,
    "statut_production" TEXT,
    "note_imdb" DECIMAL(3,1),
    "is_animation" BOOLEAN NOT NULL DEFAULT false,
    "next_episode_air_date" DATE,
    "source" TEXT NOT NULL DEFAULT 'tmdb',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tmdb_sync_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tmdb_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tmdb_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows_serie" (
    "user_id" UUID NOT NULL,
    "title_id" UUID NOT NULL,
    "followed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_serie_pkey" PRIMARY KEY ("user_id","title_id")
);

-- CreateTable
CREATE TABLE "user_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ratings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title_id" UUID,
    "episode_id" UUID,
    "note_perso" DECIMAL(3,1),
    "commentaire" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_watches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title_id" UUID,
    "episode_id" UUID,
    "date_vue" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "pseudo" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tmdb_id" INTEGER,
    "nom" TEXT NOT NULL,
    "logo_url" TEXT,

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "title_studios" (
    "title_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,

    CONSTRAINT "title_studios_pkey" PRIMARY KEY ("title_id","studio_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE INDEX "idx_credits_person" ON "credits"("person_id");

-- CreateIndex
CREATE INDEX "idx_credits_title" ON "credits"("title_id");

-- CreateIndex
CREATE INDEX "idx_credits_episode" ON "credits"("episode_id");

-- CreateIndex
CREATE INDEX "idx_credits_role" ON "credits"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "credits_title_id_person_id_role_id_episode_id_key" ON "credits"("title_id", "person_id", "role_id", "episode_id");

-- CreateIndex
CREATE INDEX "idx_episodes_date_sortie" ON "episodes"("date_sortie");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_season_id_numero_key" ON "episodes"("season_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "genres_nom_key" ON "genres"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "genres_tmdb_id_key" ON "genres"("tmdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "people_tmdb_id_key" ON "people"("tmdb_id");

-- CreateIndex
CREATE INDEX "idx_people_nom" ON "people"("nom");

-- CreateIndex
CREATE INDEX "idx_seasons_title" ON "seasons"("title_id");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_title_id_numero_key" ON "seasons"("title_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "titles_tmdb_id_key" ON "titles"("tmdb_id");

-- CreateIndex
CREATE INDEX "idx_titles_date_sortie" ON "titles"("date_sortie");

-- CreateIndex
CREATE INDEX "idx_titles_note_imdb" ON "titles"("note_imdb");

-- CreateIndex
CREATE INDEX "idx_titles_titre_vo" ON "titles"("titre_vo");

-- CreateIndex
CREATE INDEX "idx_titles_type" ON "titles"("type");

-- CreateIndex
CREATE INDEX "idx_sync_log_tmdb" ON "tmdb_sync_log"("tmdb_id", "type");

-- CreateIndex
CREATE INDEX "idx_follows_title" ON "user_follows_serie"("title_id");

-- CreateIndex
CREATE INDEX "idx_ratings_user" ON "user_ratings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_ratings_user_id_episode_id_key" ON "user_ratings"("user_id", "episode_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_ratings_user_id_title_id_key" ON "user_ratings"("user_id", "title_id");

-- CreateIndex
CREATE INDEX "idx_watches_episode" ON "user_watches"("episode_id");

-- CreateIndex
CREATE INDEX "idx_watches_title" ON "user_watches"("title_id");

-- CreateIndex
CREATE INDEX "idx_watches_user" ON "user_watches"("user_id");

-- CreateIndex
CREATE INDEX "idx_watches_user_date" ON "user_watches"("user_id", "date_vue");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_pseudo_key" ON "users"("pseudo");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "studios_tmdb_id_key" ON "studios"("tmdb_id");

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "user_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_shares" ADD CONSTRAINT "list_shares_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "user_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_shares" ADD CONSTRAINT "list_shares_shared_with_user_id_fkey" FOREIGN KEY ("shared_with_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_pays_id_fkey" FOREIGN KEY ("pays_id") REFERENCES "countries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "person_recommendations" ADD CONSTRAINT "person_recommendations_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "person_recommendations" ADD CONSTRAINT "person_recommendations_recommended_id_fkey" FOREIGN KEY ("recommended_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "title_countries" ADD CONSTRAINT "title_countries_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "title_countries" ADD CONSTRAINT "title_countries_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "title_genres" ADD CONSTRAINT "title_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "title_genres" ADD CONSTRAINT "title_genres_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "title_recommendations" ADD CONSTRAINT "title_recommendations_recommended_id_fkey" FOREIGN KEY ("recommended_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "title_recommendations" ADD CONSTRAINT "title_recommendations_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_follows_serie" ADD CONSTRAINT "user_follows_serie_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_follows_serie" ADD CONSTRAINT "user_follows_serie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_lists" ADD CONSTRAINT "user_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_watches" ADD CONSTRAINT "user_watches_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_watches" ADD CONSTRAINT "user_watches_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_watches" ADD CONSTRAINT "user_watches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "title_studios" ADD CONSTRAINT "title_studios_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "title_studios" ADD CONSTRAINT "title_studios_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

