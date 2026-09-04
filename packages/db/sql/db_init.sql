-- ============================================================
-- SCHEMA : movie/serie tracker (eMDB) — v2
-- PostgreSQL - pgcrypto pour gen_random_uuid()
-- Intègre les gaps identifiés en phase de conception :
--   - distinction animation / live-action indépendante du genre
--   - suivi de "next episode to air" pour le calendrier
--   - suivi explicite des séries suivies par un user
--   - log de synchronisation TMDB
--   - triggers updated_at
--   - vues matérialisées pour la dataviz
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- UTILISATEURS
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    pseudo          TEXT NOT NULL UNIQUE,
    avatar_url      TEXT,
    -- 'pending' à l'inscription (en attente de validation par l'admin, cf.
    -- ADMIN_EMAILS), 'active' une fois approuvé, 'rejected' si refusé (login
    -- bloqué dans les deux cas hors 'active', cf. auth.service.ts).
    -- NB : colonne du chantier "notifications push" (pas du chantier
    -- studios), incluse par erreur dans le commit 2ede937 en même temps que
    -- user_follows_studio — le code applicatif correspondant n'est pas
    -- encore committé au moment de cette note, et cette colonne n'a pas
    -- encore été appliquée en production.
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','rejected')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- REFERENTIELS
-- ============================================================

CREATE TABLE genres (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom     TEXT NOT NULL UNIQUE,
    tmdb_id INT UNIQUE
);

CREATE TABLE countries (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code    CHAR(2) NOT NULL UNIQUE,   -- ISO 3166-1 alpha-2
    nom     TEXT NOT NULL
);

-- [v3] Référentiel des rôles de crédit (remplace le CHECK figé sur credits.role) :
-- permet d'ajouter des rôles TMDB (producteur, compositeur, monteur...) sans migration de schéma,
-- au lieu de tout aplatir sur 'autre'.
CREATE TABLE roles (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code    TEXT NOT NULL UNIQUE,   -- ex: 'acteur','realisateur','scenariste','producteur','compositeur','photographe','monteur','invite','autre'
    libelle TEXT NOT NULL
);

-- [v3] Studios de production (many-to-many : un titre peut avoir plusieurs studios, cf. TMDB production_companies)
CREATE TABLE studios (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tmdb_id  INT UNIQUE,
    nom      TEXT NOT NULL,
    logo_url TEXT
);

-- ============================================================
-- PERSONNES (acteurs / realisateurs, role porte par credits)
-- ============================================================

CREATE TABLE people (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tmdb_id         INT UNIQUE,
    nom             TEXT NOT NULL,
    genre           TEXT CHECK (genre IN ('homme','femme','autre','non_specifie')),
    date_naissance  DATE,
    pays_id         UUID REFERENCES countries(id),
    photo_url       TEXT,
    bio             TEXT,
    wiki_url        TEXT,   -- [v3] lien Wikipedia, résolu via TMDB external_ids (wikidata_id) + API Wikidata
    source          TEXT NOT NULL DEFAULT 'tmdb',  -- tmdb, scraping_x, manuel...
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_people_nom ON people(nom);

-- ============================================================
-- TITRES (films + series unifies, type discrimine le reste)
-- ============================================================

CREATE TABLE titles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tmdb_id                 INT UNIQUE,
    type                    TEXT NOT NULL CHECK (type IN ('film','serie')),
    titre_vo                TEXT NOT NULL,
    titre_vf                TEXT,
    synopsis                TEXT,
    affiche_url             TEXT,
    date_sortie             DATE,
    duree_minutes           INT,                 -- pertinent surtout pour type='film'
    statut_serie            TEXT CHECK (statut_serie IN ('en_cours','terminee','annulee')), -- NULL si film ; suivi calendrier (episodes a venir ou non)
    statut_production       TEXT CHECK (statut_production IN ('rumeur','prevu','en_tournage','post_production','sorti','annule')), -- [v3] cycle de vie avant/apres sortie, valable film ET serie (cf. TMDB "status")
    note_imdb               NUMERIC(3,1),
    is_animation            BOOLEAN NOT NULL DEFAULT false,   -- [v2] dérivé du genre TMDB "Animation" à l'import, dénormalisé pour perf dataviz
    next_episode_air_date   DATE,                              -- [v2] rempli depuis next_episode_to_air (TMDB), NULL si film ou série terminée
    source                  TEXT NOT NULL DEFAULT 'tmdb',  -- tmdb, senscritique, scraping_x...
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_titles_type ON titles(type);
CREATE INDEX idx_titles_titre_vo ON titles(titre_vo);
CREATE INDEX idx_titles_date_sortie ON titles(date_sortie);          -- [v2] tri chronologique / calendrier
CREATE INDEX idx_titles_note_imdb ON titles(note_imdb);              -- [v2] filtres dataviz

CREATE TABLE title_genres (
    title_id    UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    genre_id    UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (title_id, genre_id)
);

CREATE TABLE title_countries (
    title_id    UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    country_id  UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    PRIMARY KEY (title_id, country_id)
);

-- [v3] many-to-many titre <-> studios de production
CREATE TABLE title_studios (
    title_id    UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    studio_id   UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    PRIMARY KEY (title_id, studio_id)
);

-- ============================================================
-- SAISONS / EPISODES (uniquement pour titles.type = 'serie')
-- ============================================================

CREATE TABLE seasons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id    UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    numero      INT NOT NULL,
    titre       TEXT,
    date_sortie DATE,
    synopsis    TEXT,
    UNIQUE (title_id, numero)
);

CREATE INDEX idx_seasons_title ON seasons(title_id);   -- [v2] explicite, en plus de la FK

CREATE TABLE episodes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id       UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    numero          INT NOT NULL,
    titre           TEXT,
    synopsis        TEXT,
    date_sortie     DATE,
    duree_minutes   INT,
    image_url       TEXT,   -- [v3] TMDB still_path (capture d'écran de l'épisode)
    UNIQUE (season_id, numero)
);

CREATE INDEX idx_episodes_date_sortie ON episodes(date_sortie);

-- ============================================================
-- DISTRIBUTION (table pivot titles <-> people, [v3] + episodes en option)
-- ============================================================

CREATE TABLE credits (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id    UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    person_id   UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    episode_id  UUID REFERENCES episodes(id) ON DELETE CASCADE,  -- [v3] NULL = credit au niveau du titre entier ; rempli = guest star/crew specifique a un episode (cf. TMDB guest_stars par episode)
    role_id     UUID NOT NULL REFERENCES roles(id),              -- [v3] remplace l'ancien CHECK figé role TEXT IN (...)
    personnage  TEXT,           -- rempli seulement si le role est de type acteur
    ordre       INT,            -- ordre d'affichage dans la distribution
    source      TEXT NOT NULL DEFAULT 'tmdb',
    UNIQUE (title_id, person_id, role_id, episode_id)
    -- ATTENTION (meme caveat que user_ratings, cf. Phase 1.5) : Postgres ignore les NULL
    -- dans les contraintes UNIQUE, donc plusieurs credits avec episode_id NULL et memes
    -- title_id/person_id/role_id ne sont PAS bloques par cette contrainte seule.
    -- A couvrir par un test d'integration dedie, comme pour user_ratings.
);

CREATE INDEX idx_credits_person ON credits(person_id);
CREATE INDEX idx_credits_title ON credits(title_id);
CREATE INDEX idx_credits_episode ON credits(episode_id);
CREATE INDEX idx_credits_role ON credits(role_id);

-- ============================================================
-- VISIONNAGES (vue datee, a la maille titre OU episode)
-- ============================================================

CREATE TABLE user_watches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_id    UUID REFERENCES titles(id) ON DELETE CASCADE,
    episode_id  UUID REFERENCES episodes(id) ON DELETE CASCADE,
    date_vue    TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Contexte de visionnage, saisi a posteriori (jamais a la creation du
    -- watch) : support ("ordinateur"/"tv"/"telephone"/"cinema"), compagnie
    -- ("seul"/"accompagne"), emotion (tableau, un watch peut avoir plusieurs
    -- emotions : "content"/"triste"/"emu"/"enthousiaste"/"decu"/"tendu"/
    -- "effraye"/"neutre"). Tous nullable (contexte optionnel). Valide cote
    -- API (DTO @IsEnum), pas de CHECK ici (meme convention que
    -- list_items.statut, cf. packages/db/prisma/schema.prisma).
    support     TEXT,
    compagnie   TEXT,
    emotion     TEXT[],
    CONSTRAINT chk_watch_target CHECK (
        (title_id IS NOT NULL AND episode_id IS NULL) OR
        (title_id IS NULL AND episode_id IS NOT NULL)
    )
);

CREATE INDEX idx_watches_user ON user_watches(user_id);
CREATE INDEX idx_watches_title ON user_watches(title_id);
CREATE INDEX idx_watches_episode ON user_watches(episode_id);
CREATE INDEX idx_watches_user_date ON user_watches(user_id, date_vue);   -- [v2] agrégations dataviz par période

-- ============================================================
-- NOTES / COMMENTAIRES (titre entier OU episode independamment)
-- ============================================================

CREATE TABLE user_ratings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_id    UUID REFERENCES titles(id) ON DELETE CASCADE,
    episode_id  UUID REFERENCES episodes(id) ON DELETE CASCADE,
    note_perso  NUMERIC(3,1) CHECK (note_perso BETWEEN 0 AND 10),
    commentaire TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_rating_target CHECK (
        (title_id IS NOT NULL AND episode_id IS NULL) OR
        (title_id IS NULL AND episode_id IS NOT NULL)
    ),
    UNIQUE (user_id, title_id),
    UNIQUE (user_id, episode_id)
);

CREATE INDEX idx_ratings_user ON user_ratings(user_id);

-- [v2] trigger : auto-update de updated_at à chaque modification d'une note
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_ratings_updated_at
    BEFORE UPDATE ON user_ratings
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- LISTES (a voir, personnalisees) + partage
-- ============================================================

-- Valeurs de `type` alignées sur celles réellement écrites par le code
-- ('a_voir'/'personnalisee' ne correspondaient à aucun appel actuel) :
-- 'watchlist'/'favoris'/'custom' (création utilisateur, cf.
-- lists.service.ts + create-list.dto.ts, et la liste par défaut créée à
-- l'inscription, cf. auth.service.ts) et 'collection' (listes générées par
-- l'import Trakt, cf. trakt-import.worker.ts). Même classe de bug que
-- tmdb_sync_log_action_check : toute base initialisée depuis ce fichier
-- (contrairement à une base créée via `prisma db push`, qui ne connaît pas
-- ces check constraints) faisait échouer la création de CHAQUE liste,
-- y compris la watchlist par défaut à l'inscription.
CREATE TABLE user_lists (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nom         TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('watchlist','favoris','custom','collection')),
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE list_items (
    list_id     UUID NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
    title_id    UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    position    INT,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Statut de progression pour la watchlist : "en_cours" (défaut), "a_jour", "abandonnee".
    -- Validé côté API (DTO @IsEnum), pas de CHECK ici (cf. packages/db/prisma/schema.prisma).
    statut      TEXT NOT NULL DEFAULT 'en_cours',
    PRIMARY KEY (list_id, title_id)
);

CREATE TABLE list_shares (
    list_id             UUID NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission          TEXT NOT NULL CHECK (permission IN ('lecture','edition')) DEFAULT 'lecture',
    shared_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (list_id, shared_with_user_id)
);

-- ============================================================
-- SUIVI DE SERIES [v2] (pour calendrier + notifications ciblees)
-- ============================================================

CREATE TABLE user_follows_serie (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_id    UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, title_id),
    CONSTRAINT chk_follow_is_serie CHECK (
        -- pas de contrainte SQL directe possible vers titles.type ici sans trigger ;
        -- a valider en appli (title.type = 'serie') ou via trigger BEFORE INSERT si on veut du dur
        true
    )
);

CREATE INDEX idx_follows_title ON user_follows_serie(title_id);

-- ============================================================
-- SUIVI DE PERSONNES (auto-watchlist des futurs titres + module accueil)
-- ============================================================

CREATE TABLE user_follows_person (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    person_id   UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, person_id)
);

CREATE INDEX idx_follows_person_person ON user_follows_person(person_id);

-- ============================================================
-- SUIVI DE STUDIOS (bookmark simple, pas d'auto-watchlist pour l'instant)
-- ============================================================

CREATE TABLE user_follows_studio (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    studio_id   UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, studio_id)
);

CREATE INDEX idx_follows_studio_studio ON user_follows_studio(studio_id);

-- ============================================================
-- RECOMMANDATIONS ALGO ("connexes") - precalculees en batch
-- ============================================================

CREATE TABLE title_recommendations (
    title_id        UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    recommended_id  UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    score           NUMERIC(5,4) NOT NULL,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (title_id, recommended_id),
    CHECK (title_id <> recommended_id)
);

CREATE TABLE person_recommendations (
    person_id       UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    recommended_id  UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    score           NUMERIC(5,4) NOT NULL,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (person_id, recommended_id),
    CHECK (person_id <> recommended_id)
);

-- ============================================================
-- NOTIFICATIONS (nouveaux episodes suivis, rappels...)
-- ============================================================

-- Valeurs de `type` alignées sur celles réellement écrites par le code
-- (generateNewEpisodeNotifications/generateSeasonPremiereNotification,
-- packages/tmdb-sync/src/index.ts) — 'nouvel_episode'/'rappel'/'recommandation'
-- ne correspondaient à aucun appel actuel. Même classe de bug que
-- tmdb_sync_log_action_check/user_lists_type_check.
--
-- NB : title_id/related_user_id/message et les types account_request/
-- account_login/new_film_person/new_film_studio font partie du chantier
-- "notifications push" (pas du chantier studios), inclus par erreur dans le
-- commit 2ede937 en même temps que user_follows_studio — idem pour la table
-- push_tokens ci-dessous. Ni l'un ni l'autre n'était encore appliqué en
-- production au moment de cette note.
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id      UUID REFERENCES episodes(id) ON DELETE CASCADE,
    title_id        UUID REFERENCES titles(id) ON DELETE CASCADE,
    -- 'account_request'/'account_login' : notifs admin du flux de validation
    -- des inscriptions (cf. auth.service.ts) — pas liées à un episode/titre,
    -- portent leur propre texte (message) et pointent vers l'utilisateur
    -- concerné (related_user_id) plutôt qu'un episode/titre.
    type            TEXT NOT NULL CHECK (type IN ('new_episode','season_premiere','new_film_person','new_film_studio','account_request','account_login')),
    related_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message         TEXT,
    lu              BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE lu = false;
CREATE INDEX idx_notifications_title ON notifications(title_id);

-- ============================================================
-- TOKENS PUSH (Firebase Cloud Messaging, app Android Capacitor)
-- ============================================================

CREATE TABLE push_tokens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token         TEXT NOT NULL UNIQUE,
    platform      TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);

-- ============================================================
-- LOG DE SYNCHRONISATION TMDB [v2]
-- ============================================================

-- Valeurs de `action`/`status` alignées sur les seuls appels réels de
-- `createSyncLog()` (packages/tmdb-sync/src/index.ts, `importTitleByTmdbId`)
-- — les valeurs françaises d'origine ('import'/'refresh'/'import_saisons',
-- 'succes'/'echec') ne correspondaient à aucun appel du code actuel : toute
-- table initialisée depuis ce fichier (ex. `docker-entrypoint-initdb.d`,
-- contrairement à une base créée via `prisma db push`, qui ne connaît pas
-- ces check constraints, cf. schema.prisma) faisait échouer silencieusement
-- CHAQUE import de titre (createSyncLog rejeté par la contrainte, l'erreur
-- non catchée dans `importTitleByTmdbId` remontait jusqu'au `catch` vide de
-- `findOrImportTitle`, qui comptait juste le titre en échec).
CREATE TABLE tmdb_sync_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tmdb_id     INT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('film','serie','personne')),
    action      TEXT NOT NULL CHECK (action IN ('importTitle','importPerson','dailySyncNewEpisodes','weeklyResyncChanges')),
    status      TEXT NOT NULL CHECK (status IN ('started','success','failed')),
    error       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_log_tmdb ON tmdb_sync_log(tmdb_id, type);
CREATE INDEX idx_sync_log_status_echec ON tmdb_sync_log(created_at) WHERE status = 'failed';

-- ============================================================
-- SITES "GRATUITS" WHITELISTES (liens streaming libre)
-- ============================================================

-- Table unique partagee par tous les utilisateurs (pas de scoping par
-- user_id) : la whitelist est une config globale de l'application, pas une
-- preference personnelle. Remplace les 3 sites codes en dur dans
-- watch-links.util.ts (WatchTV/HydraFlix/MovieDB Wiki) — voir commentaire
-- sur `url_recherche`/`url_directe`/`selecteur_resultat` cote API pour le
-- format exact des templates et du selecteur.
CREATE TABLE free_watch_sites (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom                 TEXT NOT NULL,
    -- Template d'URL de recherche, `{query}` = titre a chercher (encode
    -- automatiquement). Seul champ vraiment requis en plus du nom.
    url_recherche       TEXT NOT NULL,
    -- Template d'URL devinee (essai rapide avant la recherche), `{slug}` =
    -- titre slugifie, `{type}` = "movie"/"series". Optionnel : si absent,
    -- l'algo passe direct par la recherche.
    url_directe         TEXT,
    -- Selecteur CSS des elements "carte resultat" sur la page de recherche
    -- (ex. "article.TPost"). Optionnel : si absent, heuristique generique
    -- (tout <a> contenant une <img>) — moins precise mais fonctionne sans
    -- configuration sur un site jamais vu.
    selecteur_resultat  TEXT,
    actif               BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SELECTION DE FESTIVALS (module "Selection" de Decouvrir)
-- ============================================================

-- Suivi des editions de festivals/ceremonies deja notifiees — evite de
-- re-notifier tous les utilisateurs a chaque passage du cron
-- check-festival-selections une fois la selection d'une edition deja
-- signalee une premiere fois.
CREATE TABLE festival_editions_notified (
    edition_qid   TEXT PRIMARY KEY,
    festival_nom  TEXT NOT NULL,
    notified_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FONCTIONS METIER [v2]
-- ============================================================

-- Nombre d'episodes sortis mais non vus par un user pour une serie donnee
CREATE OR REPLACE FUNCTION fn_episodes_non_vus(p_user_id UUID, p_title_id UUID)
RETURNS INT AS $$
    SELECT COUNT(*)::INT
    FROM episodes e
    JOIN seasons s ON s.id = e.season_id
    WHERE s.title_id = p_title_id
      AND e.date_sortie IS NOT NULL
      AND e.date_sortie <= CURRENT_DATE
      AND NOT EXISTS (
          SELECT 1 FROM user_watches uw
          WHERE uw.user_id = p_user_id AND uw.episode_id = e.id
      );
$$ LANGUAGE sql STABLE;

-- Progression (vus / total) par saison pour un user et une serie donnee
-- Spéciaux (saison 0) et épisodes pas encore sortis (date_sortie future ou
-- inconnue) exclus du calcul : même règle que getContinueWatching (bug
-- House of the Dragon, saison 0 pleine de making-of/recaps gonflait le
-- total, cf. watches.service.ts).
CREATE OR REPLACE FUNCTION fn_progress_serie(p_user_id UUID, p_title_id UUID)
RETURNS TABLE(saison INT, vus INT, total INT) AS $$
    SELECT
        s.numero AS saison,
        COUNT(uw.id)::INT AS vus,
        COUNT(e.id)::INT AS total
    FROM seasons s
    JOIN episodes e ON e.season_id = s.id
    LEFT JOIN user_watches uw ON uw.episode_id = e.id AND uw.user_id = p_user_id
    WHERE s.title_id = p_title_id
      AND s.numero != 0
      AND e.date_sortie <= CURRENT_DATE
    GROUP BY s.numero
    ORDER BY s.numero;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- VUES MATERIALISEES [v2/v3] — dataviz
-- ============================================================
-- Les 8 vues mv_watch_{time,count}_by_{period,genre,country,animation} ne
-- sont plus definies ici : elles sont geree par dbt (packages/dbt-analytics,
-- modeles marts/dataviz/mart_watch_*), qui recree les memes objets (sous le
-- meme nom, via un alias) comme des tables plutot que des MATERIALIZED VIEW
-- natives. Voir wiki/Architecture#migrations et packages/dbt-analytics/README.md.
-- Rafraichissement a orchestrer via le worker (cron nocturne), cf. roadmap phase 1.4