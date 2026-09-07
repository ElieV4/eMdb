-- Row-Level Security en defense-in-depth sur les tables les plus sensibles
-- (donnees personnelles d'un utilisateur), en complement des controles
-- d'autorisation deja verifies au niveau service (ex. "Forbidden si non
-- proprietaire" dans lists.service.ts). Filet de securite si un bug
-- applicatif ou une injection SQL contourne un jour ces controles.
--
-- Mecanisme : chaque requete API declare qui elle est via
-- `SELECT set_config('app.user_id', '<uuid>', true)` (SET LOCAL, portee a
-- la transaction courante) avant d'executer sa requete Prisma -- cf.
-- PrismaService.forUser(). Les operations legitimement transverses a tous
-- les utilisateurs (stats admin, verification avant suppression d'un
-- titre, notification a l'admin) declarent `app.bypass_rls = 'true'` --
-- cf. PrismaService.asSystem(). Le worker (jobs BullMQ, par nature
-- transverses a tous les utilisateurs) se connecte avec le role Postgres
-- d'origine (BYPASSRLS, via WORKER_DATABASE_URL) plutot que de passer par
-- ce flag ; l'API, elle, doit se connecter avec le role restreint sans
-- BYPASSRLS (`emdb_app`, cf. packages/db/sql/setup_roles.sql) pour que ces
-- policies aient un effet.
--
-- Sans contexte defini (session ni user_id ni bypass_rls), la policy est
-- fermee par defaut : aucune ligne visible/modifiable -- cf.
-- packages/db/prisma/README.md pour le detail complet et le statut de
-- deploiement (fonctionne en local/connexion directe, bloque en prod
-- Supabase via le pooler Supavisor -- cf. section "Statut production").

ALTER TABLE user_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watches FORCE ROW LEVEL SECURITY;
CREATE POLICY user_watches_isolation ON user_watches
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings FORCE ROW LEVEL SECURITY;
CREATE POLICY user_ratings_isolation ON user_ratings
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY push_tokens_isolation ON push_tokens
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY notifications_isolation ON notifications
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

-- user_lists / list_items : accessibles au proprietaire ET a quiconque a
-- une entree list_shares pour cette liste (fonctionnalite de partage) --
-- l'ecriture (WITH CHECK) sur list_items exige en plus la permission
-- 'edition' pour un utilisateur non-proprietaire.
ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lists FORCE ROW LEVEL SECURITY;
CREATE POLICY user_lists_isolation ON user_lists
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    OR EXISTS (
      SELECT 1 FROM list_shares ls
      WHERE ls.list_id = user_lists.id
      AND ls.shared_with_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items FORCE ROW LEVEL SECURITY;
CREATE POLICY list_items_isolation ON list_items
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM user_lists ul
      WHERE ul.id = list_items.list_id
      AND (
        ul.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
        OR EXISTS (
          SELECT 1 FROM list_shares ls
          WHERE ls.list_id = ul.id
          AND ls.shared_with_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
        )
      )
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM user_lists ul
      WHERE ul.id = list_items.list_id
      AND (
        ul.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
        OR EXISTS (
          SELECT 1 FROM list_shares ls
          WHERE ls.list_id = ul.id
          AND ls.shared_with_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
          AND ls.permission = 'edition'
        )
      )
    )
  );
