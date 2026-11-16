-- ============================================================
-- Listes partagées : mode de partage au niveau de la liste
-- ============================================================
--
-- Avant : chaque partage (list_shares) portait sa propre permission
-- ('lecture' | 'edition'). Désormais le mode s'applique à TOUS les membres
-- d'une liste, via user_lists.share_mode :
--
--   | Action                                   | lecture | collaboratif | ouvert |
--   |------------------------------------------|---------|--------------|--------|
--   | voir la liste et ses titres              |   oui   |     oui      |  oui   |
--   | réordonner / statut / renommer / descr.  |   non   |     oui      |  oui   |
--   | ajouter un titre                         |   non   |     non      |  oui   |
--   | retirer un titre                         |   non   |     non      |  oui   |
--   | supprimer la liste, gérer membres & mode | créateur uniquement           |
--
-- Cette matrice est dupliquée côté API (apps/api/src/lists/list-permissions.ts) :
-- les deux doivent rester synchronisées.

-- 1. Nouvelle colonne
ALTER TABLE "user_lists"
  ADD COLUMN "share_mode" TEXT NOT NULL DEFAULT 'lecture';

ALTER TABLE "user_lists"
  ADD CONSTRAINT "user_lists_share_mode_check"
  CHECK ("share_mode" IN ('lecture', 'collaboratif', 'ouvert'));

-- 2. Reprise des données : une liste ne passe en 'ouvert' que si TOUS ses
-- partages étaient en 'edition'. Un mélange lecture/edition reste en
-- 'lecture' — on ne donne jamais à un membre plus de droits qu'avant.
UPDATE "user_lists" ul
SET "share_mode" = 'ouvert'
WHERE EXISTS (SELECT 1 FROM "list_shares" ls WHERE ls.list_id = ul.id)
  AND NOT EXISTS (
    SELECT 1 FROM "list_shares" ls
    WHERE ls.list_id = ul.id AND ls.permission <> 'edition'
  );

-- 3. La permission par partage disparaît (list_shares = appartenance seule).
-- Les policies existantes la référencent : on les supprime avant la colonne.
DROP POLICY IF EXISTS user_lists_isolation ON "user_lists";
DROP POLICY IF EXISTS list_items_isolation ON "list_items";

ALTER TABLE "list_shares" DROP COLUMN "permission";

-- 4. Matrice de droits, évaluée pour l'utilisateur courant (app.user_id).
--
-- SECURITY DEFINER : la fonction lit user_lists et list_shares sans repasser
-- par leurs policies. Sans ça, la policy de user_lists (qui lit list_shares)
-- et celle de list_shares (qui lit user_lists) se rappelleraient en boucle
-- ("infinite recursion detected in policy"). Le propriétaire de la fonction
-- est le rôle qui applique les migrations (BYPASSRLS, cf. prisma/README.md).
--
-- L'utilisateur est lu dans app.user_id, jamais passé en paramètre : un
-- appelant ne peut donc pas interroger les droits d'un autre utilisateur.
CREATE OR REPLACE FUNCTION fn_list_can(p_list_id UUID, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   UUID := NULLIF(current_setting('app.user_id', true), '')::uuid;
  v_owner  UUID;
  v_mode   TEXT;
BEGIN
  IF current_setting('app.bypass_rls', true) = 'true' THEN
    RETURN TRUE;
  END IF;

  IF v_user IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT user_id, share_mode INTO v_owner, v_mode
  FROM user_lists
  WHERE id = p_list_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Le créateur peut tout faire.
  IF v_owner = v_user THEN
    RETURN TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM list_shares
    WHERE list_id = p_list_id AND shared_with_user_id = v_user
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN CASE p_action
    WHEN 'read'        THEN TRUE
    WHEN 'item:update' THEN v_mode IN ('collaboratif', 'ouvert')
    WHEN 'list:update' THEN v_mode IN ('collaboratif', 'ouvert')
    WHEN 'item:add'    THEN v_mode = 'ouvert'
    WHEN 'item:remove' THEN v_mode = 'ouvert'
    -- 'list:delete', 'shares:manage' et toute action inconnue : créateur seul.
    ELSE FALSE
  END;
END;
$$;

-- Fonction SECURITY DEFINER dans le schéma public : on retire l'EXECUTE par
-- défaut de PUBLIC (sinon appelable via la Data API Supabase pour les rôles
-- anon/authenticated) et on ne le rend qu'au rôle applicatif.
REVOKE ALL ON FUNCTION fn_list_can(UUID, TEXT) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'emdb_app') THEN
    GRANT EXECUTE ON FUNCTION fn_list_can(UUID, TEXT) TO emdb_app;
  END IF;
END
$$;

-- 5. Policies par commande.
--
-- Partout où la ligne porte elle-même le user_id du créateur, le test
-- "créateur" est fait en ligne plutôt que via fn_list_can : pour un INSERT
-- ... RETURNING, la policy SELECT est évaluée sur la nouvelle ligne, que la
-- fonction (qui relit la table) ne verrait pas encore.

-- user_lists
CREATE POLICY user_lists_select ON "user_lists" FOR SELECT
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    OR fn_list_can(id, 'read')
  );

CREATE POLICY user_lists_insert ON "user_lists" FOR INSERT
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

CREATE POLICY user_lists_update ON "user_lists" FOR UPDATE
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    OR fn_list_can(id, 'list:update')
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    OR fn_list_can(id, 'list:update')
  );

CREATE POLICY user_lists_delete ON "user_lists" FOR DELETE
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

-- list_items
CREATE POLICY list_items_select ON "list_items" FOR SELECT
  USING (fn_list_can(list_id, 'read'));

CREATE POLICY list_items_insert ON "list_items" FOR INSERT
  WITH CHECK (fn_list_can(list_id, 'item:add'));

CREATE POLICY list_items_update ON "list_items" FOR UPDATE
  USING (fn_list_can(list_id, 'item:update'))
  WITH CHECK (fn_list_can(list_id, 'item:update'));

CREATE POLICY list_items_delete ON "list_items" FOR DELETE
  USING (fn_list_can(list_id, 'item:remove'));

-- list_shares (n'avait aucune RLS jusqu'ici)
ALTER TABLE "list_shares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "list_shares" FORCE ROW LEVEL SECURITY;

-- Un membre voit sa propre entrée, le créateur voit tous les membres.
CREATE POLICY list_shares_select ON "list_shares" FOR SELECT
  USING (
    shared_with_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    OR fn_list_can(list_id, 'shares:manage')
  );

CREATE POLICY list_shares_insert ON "list_shares" FOR INSERT
  WITH CHECK (fn_list_can(list_id, 'shares:manage'));

-- Le créateur retire un membre, ou un membre quitte la liste.
CREATE POLICY list_shares_delete ON "list_shares" FOR DELETE
  USING (
    shared_with_user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    OR fn_list_can(list_id, 'shares:manage')
  );

-- Pas de policy UPDATE : un partage ne se modifie pas (on le supprime et le
-- recrée), fermé par défaut sauf app.bypass_rls.
CREATE POLICY list_shares_update ON "list_shares" FOR UPDATE
  USING (current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (current_setting('app.bypass_rls', true) = 'true');

-- 6. Colonnes réservées au créateur.
-- La RLS filtre des lignes, pas des colonnes : un membre en mode
-- 'collaboratif'/'ouvert' a le droit d'UPDATE sur la ligne user_lists (pour
-- renommer), ce trigger l'empêche de toucher au mode, au type ou au créateur.
CREATE OR REPLACE FUNCTION fn_user_lists_guard_owner_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user UUID := NULLIF(current_setting('app.user_id', true), '')::uuid;
BEGIN
  IF current_setting('app.bypass_rls', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Le créateur d''une liste ne peut pas être modifié.'
      USING ERRCODE = '42501';
  END IF;

  IF v_user IS DISTINCT FROM OLD.user_id AND (
       NEW.share_mode IS DISTINCT FROM OLD.share_mode
    OR NEW.type       IS DISTINCT FROM OLD.type
  ) THEN
    RAISE EXCEPTION 'Seul le créateur peut modifier le mode de partage ou le type de la liste.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_lists_guard_owner_columns
  BEFORE UPDATE ON "user_lists"
  FOR EACH ROW
  EXECUTE FUNCTION fn_user_lists_guard_owner_columns();
