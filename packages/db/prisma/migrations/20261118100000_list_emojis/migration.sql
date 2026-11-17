-- ============================================================
-- Emoji des listes, groupes et sous-groupes
-- ============================================================
--
-- Facultatif, affiché devant le nom (en-tête de la page liste, page des
-- listes, barre des sous-groupes). Un emoji peut compter plusieurs points de
-- code (drapeaux, familles, variantes de couleur) : borné à 16 caractères.

-- AlterTable
ALTER TABLE "user_lists" ADD COLUMN "emoji" TEXT;

-- AlterTable
ALTER TABLE "list_groups" ADD COLUMN "emoji" TEXT;

ALTER TABLE "user_lists"
  ADD CONSTRAINT "user_lists_emoji_check" CHECK ("emoji" IS NULL OR char_length("emoji") BETWEEN 1 AND 16);
ALTER TABLE "list_groups"
  ADD CONSTRAINT "list_groups_emoji_check" CHECK ("emoji" IS NULL OR char_length("emoji") BETWEEN 1 AND 16);
