-- ============================================================
-- Ferme la Data API Supabase (PostgREST) aux rôles anon / authenticated
-- ============================================================
--
-- Supabase expose le schéma public en REST (https://<projet>.supabase.co/rest/v1/<table>)
-- aux rôles `anon` et `authenticated`, avec des GRANT ALL par défaut sur tout
-- objet créé. La clé publishable / anon est publique par nature : tout objet
-- lisible par ces rôles est donc lisible par n'importe qui.
--
-- Constaté en production avant cette migration (sonde anonyme, comptage seul) :
--   - stg_user_watches / int_watches_enriched : historique de visionnage de
--     TOUS les utilisateurs. Ces vues (dbt) s'exécutent avec les droits de
--     leur propriétaire (postgres, BYPASSRLS) : la RLS de user_watches ne
--     s'y applique pas ;
--   - mv_watch_* (tables dbt, sans RLS) : statistiques par user_id, lisibles
--     et modifiables ;
--   - les autres tables étaient protégées par RLS (sans policy pour anon),
--     mais leurs GRANT restaient en place.
--
-- L'application n'utilise jamais cette API : l'API NestJS et le worker passent
-- par Prisma en connexion Postgres directe (rôles `postgres` / `emdb_app`).
--
-- Reprend le correctif de la branche fix/lock-down-supabase-data-api
-- (20261002120000), avec deux différences :
--   - les tables des listes partagées (list_shares, list_groups,
--     list_item_groups, list_item_comments) sont traitées comme user-scoped :
--     une policy permissive emdb_app_full_access y annulerait la matrice de
--     droits de fn_list_can (les policies permissives se combinent en OR) ;
--   - les fonctions reçoivent un search_path fixe (advisor Supabase).
--
-- Idempotente. Les blocs testent l'existence des rôles : anon / authenticated
-- n'existent que sur Supabase, emdb_app seulement là où setup_roles.sql a tourné.

-- 1. Aucun droit pour anon / authenticated, ni maintenant ni sur les objets futurs.
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
      IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
        BEGIN
          EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
          EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
          EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
        EXCEPTION WHEN insufficient_privilege THEN
          RAISE NOTICE 'Default privileges de supabase_admin non modifiables par ce rôle, ignoré';
        END;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 2. RLS sur toutes les tables du schéma public (filet de sécurité si un GRANT
-- revenait). emdb_app garde l'accès aux tables sans notion d'utilisateur via
-- une policy permissive ; les tables user-scoped gardent leurs policies.
DO $$
DECLARE
  t text;
  user_scoped text[] := ARRAY[
    'user_watches', 'user_ratings', 'push_tokens', 'notifications',
    'user_lists', 'list_items', 'list_shares', 'list_groups',
    'list_item_groups', 'list_item_comments'
  ];
  has_app_role boolean := EXISTS (SELECT FROM pg_roles WHERE rolname = 'emdb_app');
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS emdb_app_full_access ON public.%I', t);
    IF has_app_role AND NOT (t = ANY (user_scoped)) THEN
      EXECUTE format(
        'CREATE POLICY emdb_app_full_access ON public.%I TO emdb_app USING (true) WITH CHECK (true)',
        t
      );
    END IF;
  END LOOP;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_prisma_migrations') THEN
    ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 3. Vues dbt (stg_*, int_watches_enriched) : elles restent en droits du
-- propriétaire (advisor "security_definer_view"), volontairement. L'API les
-- lit sans contexte app.user_id (page Profil, dataviz) et filtre elle-même
-- par user_id ; en security_invoker, la RLS de user_watches les viderait pour
-- emdb_app. Elles ne sont plus exposées : plus aucun GRANT pour anon /
-- authenticated (étape 1, et post-hook dbt qui le réapplique à chaque build).

-- 4. search_path fixe sur les fonctions du schéma public.
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND d.objid IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', f);
  END LOOP;
END $$;
