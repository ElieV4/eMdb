-- ============================================================
-- credits : suppression des doublons et index unique effectif
-- ============================================================
--
-- L'index unique credits_title_id_person_id_role_id_episode_id_key ne
-- bloquait rien pour les credits d'un titre : leur episode_id est NULL, et
-- par défaut Postgres considère deux NULL comme distincts. Chaque import ou
-- actualisation TMDB réinsérait donc tout le casting et l'équipe (le code
-- de synchro s'attendait à une erreur "duplicate key" qui n'arrivait jamais).
-- Constaté en production le 17/11/2026 : 125 346 lignes en double sur
-- 191 210, réparties sur 27 024 groupes (titre, personne, rôle).
--
-- 1. Pour chaque groupe (title_id, person_id, role_id, episode_id), on garde
--    une ligne : le plus petit ordre (ordre d'affichage), puis le plus petit
--    id. Les noms de personnage distincts du groupe (acteur crédité pour
--    plusieurs personnages, 162 groupes en production) sont réunis sur la
--    ligne gardée, séparés par " / ".
-- 2. Les autres lignes du groupe sont supprimées.
-- 3. L'index unique est recréé en NULLS NOT DISTINCT (Postgres 15+) : deux
--    episode_id NULL comptent comme égaux, le doublon est refusé.
--
-- Prisma (5.x) ne sait pas exprimer NULLS NOT DISTINCT dans schema.prisma :
-- le @@unique y reste tel quel, seul l'index en base change.

-- Rang de chaque ligne dans son groupe (1 = ligne gardée).
CREATE TEMP TABLE credits_dedup AS
SELECT
  id,
  title_id,
  person_id,
  role_id,
  episode_id,
  row_number() OVER (
    PARTITION BY title_id, person_id, role_id, episode_id
    ORDER BY ordre NULLS LAST, id
  ) AS rn
FROM credits;

-- Personnages distincts des groupes en double, dans l'ordre d'affichage.
CREATE TEMP TABLE credits_personnages AS
SELECT title_id, person_id, role_id, episode_id,
       string_agg(personnage, ' / ' ORDER BY min_ordre NULLS LAST, personnage) AS personnages
FROM (
  SELECT title_id, person_id, role_id, episode_id, personnage, min(ordre) AS min_ordre
  FROM credits
  WHERE personnage IS NOT NULL AND btrim(personnage) <> ''
  GROUP BY title_id, person_id, role_id, episode_id, personnage
) p
GROUP BY title_id, person_id, role_id, episode_id
HAVING count(*) > 1;

-- 1. Ligne gardée : personnages réunis.
UPDATE credits c
SET personnage = cp.personnages
FROM credits_dedup d
JOIN credits_personnages cp
  ON cp.title_id = d.title_id
 AND cp.person_id = d.person_id
 AND cp.role_id = d.role_id
 AND cp.episode_id IS NOT DISTINCT FROM d.episode_id
WHERE c.id = d.id
  AND d.rn = 1;

-- 2. Doublons supprimés.
DELETE FROM credits c
USING credits_dedup d
WHERE c.id = d.id
  AND d.rn > 1;

DROP TABLE credits_dedup;
DROP TABLE credits_personnages;

-- 3. Index unique effectif, même nom.
DROP INDEX IF EXISTS "credits_title_id_person_id_role_id_episode_id_key";
CREATE UNIQUE INDEX "credits_title_id_person_id_role_id_episode_id_key"
  ON "credits" ("title_id", "person_id", "role_id", "episode_id") NULLS NOT DISTINCT;
