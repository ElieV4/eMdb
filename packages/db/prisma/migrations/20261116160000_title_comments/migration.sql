-- ============================================================
-- Commentaires sur les titres
-- ============================================================
--
-- 1. Commentaire perso : champ existant user_ratings.commentaire (un par
--    utilisateur et par titre). Nouveau réglage users.commentaires_visibles :
--    si activé, ce commentaire est visible des membres des listes partagées
--    de l'utilisateur, sur les titres de ces listes (lu côté API, la RLS de
--    user_ratings reste limitée à son propriétaire).
--
-- 2. list_item_comments : fil de commentaires partagés sur un titre d'une
--    liste, visible par tous les membres. Droits (fn_list_can) :
--      - lire : 'read' ;
--      - écrire / modifier ses commentaires : 'item:update' (créateur, ou
--        membre en collaboratif / ouvert) ;
--      - supprimer : l'auteur (avec 'item:update'), ou le créateur de la liste.
--
-- Généré par `prisma migrate diff`, complété à la main (CHECK, RLS, droits).

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "commentaires_visibles" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "list_item_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "list_id" UUID NOT NULL,
    "title_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "contenu" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_item_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "list_item_comments_list_id_title_id_created_at_idx" ON "list_item_comments"("list_id", "title_id", "created_at");

-- AddForeignKey
ALTER TABLE "list_item_comments" ADD CONSTRAINT "list_item_comments_list_id_title_id_fkey" FOREIGN KEY ("list_id", "title_id") REFERENCES "list_items"("list_id", "title_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "list_item_comments" ADD CONSTRAINT "list_item_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "list_item_comments"
  ADD CONSTRAINT "list_item_comments_contenu_check" CHECK (char_length(btrim("contenu")) BETWEEN 1 AND 2000);

ALTER TABLE "list_item_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "list_item_comments" FORCE ROW LEVEL SECURITY;

CREATE POLICY list_item_comments_select ON "list_item_comments" FOR SELECT
  USING (fn_list_can(list_id, 'read'));

CREATE POLICY list_item_comments_insert ON "list_item_comments" FOR INSERT
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR (
      user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
      AND fn_list_can(list_id, 'item:update')
    )
  );

CREATE POLICY list_item_comments_update ON "list_item_comments" FOR UPDATE
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR (
      user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
      AND fn_list_can(list_id, 'item:update')
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'true'
    OR (
      user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
      AND fn_list_can(list_id, 'item:update')
    )
  );

CREATE POLICY list_item_comments_delete ON "list_item_comments" FOR DELETE
  USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR fn_list_can(list_id, 'shares:manage')
    OR (
      user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
      AND fn_list_can(list_id, 'item:update')
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'emdb_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "list_item_comments" TO emdb_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "list_item_comments" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "list_item_comments" FROM authenticated;
  END IF;
END
$$;
