-- ============================================================
-- Listes : "vu" partagé dans la liste + sous-groupes (arbre)
-- ============================================================
--
-- 1. list_items.vu_at / vu_by : un titre est "vu" dans le cadre de la liste,
--    un seul état pour tous les membres (indépendant de l'historique perso
--    user_watches). Modifiable comme le reste du contenu : action
--    'item:update' de fn_list_can (créateur, ou membre en collaboratif/ouvert).
--
-- 2. list_groups : sous-groupes en arbre (parent_id dans la même liste, FK
--    composite). list_item_groups : un titre peut être rangé dans plusieurs
--    sous-groupes. Droits, alignés sur le contenu :
--      - créer / supprimer un sous-groupe  -> 'item:add' / 'item:remove' (ouvert)
--      - renommer, ranger / déranger un titre -> 'item:update' (collaboratif)
--
-- Généré par `prisma migrate diff`, complété à la main (CHECK, RLS, droits).

-- AlterTable
ALTER TABLE "list_items" ADD COLUMN     "vu_at" TIMESTAMPTZ(6),
ADD COLUMN     "vu_by" UUID;

-- CreateTable
CREATE TABLE "list_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "list_id" UUID NOT NULL,
    "parent_id" UUID,
    "nom" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_item_groups" (
    "list_id" UUID NOT NULL,
    "title_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,

    CONSTRAINT "list_item_groups_pkey" PRIMARY KEY ("group_id","title_id")
);

-- CreateIndex
CREATE INDEX "list_groups_list_id_idx" ON "list_groups"("list_id");

-- CreateIndex
CREATE UNIQUE INDEX "list_groups_id_list_id_key" ON "list_groups"("id", "list_id");

-- CreateIndex
CREATE INDEX "list_item_groups_list_id_title_id_idx" ON "list_item_groups"("list_id", "title_id");

-- AddForeignKey
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_vu_by_fkey" FOREIGN KEY ("vu_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_groups" ADD CONSTRAINT "list_groups_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "user_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_groups" ADD CONSTRAINT "list_groups_parent_id_list_id_fkey" FOREIGN KEY ("parent_id", "list_id") REFERENCES "list_groups"("id", "list_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_item_groups" ADD CONSTRAINT "list_item_groups_list_id_title_id_fkey" FOREIGN KEY ("list_id", "title_id") REFERENCES "list_items"("list_id", "title_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_item_groups" ADD CONSTRAINT "list_item_groups_group_id_list_id_fkey" FOREIGN KEY ("group_id", "list_id") REFERENCES "list_groups"("id", "list_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ------------------------------------------------------------
-- Contraintes hors Prisma
-- ------------------------------------------------------------
ALTER TABLE "list_groups"
  ADD CONSTRAINT "list_groups_nom_check" CHECK (char_length(btrim("nom")) BETWEEN 1 AND 100),
  ADD CONSTRAINT "list_groups_not_own_parent_check" CHECK ("parent_id" IS NULL OR "parent_id" <> "id");

-- vu_at et vu_by vont ensemble (vu_by peut redevenir NULL si le compte est
-- supprimé, ON DELETE SET NULL : seul "vu_by sans vu_at" est incohérent).
ALTER TABLE "list_items"
  ADD CONSTRAINT "list_items_vu_check" CHECK ("vu_at" IS NOT NULL OR "vu_by" IS NULL);

-- ------------------------------------------------------------
-- RLS (même mécanisme que list_items, cf. migration list_share_modes)
-- ------------------------------------------------------------
ALTER TABLE "list_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "list_groups" FORCE ROW LEVEL SECURITY;

CREATE POLICY list_groups_select ON "list_groups" FOR SELECT
  USING (fn_list_can(list_id, 'read'));
CREATE POLICY list_groups_insert ON "list_groups" FOR INSERT
  WITH CHECK (fn_list_can(list_id, 'item:add'));
CREATE POLICY list_groups_update ON "list_groups" FOR UPDATE
  USING (fn_list_can(list_id, 'item:update'))
  WITH CHECK (fn_list_can(list_id, 'item:update'));
CREATE POLICY list_groups_delete ON "list_groups" FOR DELETE
  USING (fn_list_can(list_id, 'item:remove'));

ALTER TABLE "list_item_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "list_item_groups" FORCE ROW LEVEL SECURITY;

CREATE POLICY list_item_groups_select ON "list_item_groups" FOR SELECT
  USING (fn_list_can(list_id, 'read'));
CREATE POLICY list_item_groups_insert ON "list_item_groups" FOR INSERT
  WITH CHECK (fn_list_can(list_id, 'item:update'));
CREATE POLICY list_item_groups_delete ON "list_item_groups" FOR DELETE
  USING (fn_list_can(list_id, 'item:update'));
-- Pas d'UPDATE : on supprime et recrée une appartenance.
CREATE POLICY list_item_groups_update ON "list_item_groups" FOR UPDATE
  USING (current_setting('app.bypass_rls', true) = 'true')
  WITH CHECK (current_setting('app.bypass_rls', true) = 'true');

-- ------------------------------------------------------------
-- Droits : rôle applicatif, et rien pour la Data API Supabase
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'emdb_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "list_groups", "list_item_groups" TO emdb_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "list_groups", "list_item_groups" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "list_groups", "list_item_groups" FROM authenticated;
  END IF;
END
$$;
