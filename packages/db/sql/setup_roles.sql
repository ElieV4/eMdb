-- Cree (une seule fois, par un superuser) le role Postgres restreint utilise
-- par l'API pour que le Row-Level Security (migration
-- enable_rls_user_scoped_tables) soit reellement applique.
--
-- Pourquoi un role a part : le role "proprietaire" habituel (POSTGRES_USER
-- en local, `postgres` sur Supabase) a l'attribut BYPASSRLS -- toute policy
-- RLS serait purement decorative si l'API continuait de s'y connecter.
-- Le worker, lui, garde ce role d'origine (BYPASSRLS) : ses jobs sont par
-- nature transverses a tous les utilisateurs (sync TMDB, notifications...),
-- cf. wiki/Architecture#securite pour le detail complet du mecanisme.
--
-- Local (docker-compose) : ce fichier est monte en init script Postgres,
-- execute automatiquement a la creation du volume.
-- Supabase (prod) : execute une fois via le SQL editor ou apply_migration,
-- avec un mot de passe genere (jamais celui ci-dessous, qui n'est valable
-- qu'en local).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'emdb_app') THEN
    CREATE ROLE emdb_app WITH LOGIN PASSWORD 'emdb_app' NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO emdb_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO emdb_app;
GRANT USAGE ON SCHEMA public TO emdb_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO emdb_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO emdb_app;
