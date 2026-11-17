-- Nouveau statut users.status = 'unverified' : compte créé mais adresse
-- email pas encore confirmée (lien envoyé à l'inscription). La confirmation
-- le passe en 'pending' (validation admin), cf. auth.service.ts.
--
-- La contrainte CHECK vient de db_init.sql (absente de l'historique Prisma) :
-- selon la façon dont la base a été provisionnée elle peut ne pas exister,
-- d'où le DROP ... IF EXISTS avant de la recréer.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_status_check";
ALTER TABLE "users" ADD CONSTRAINT "users_status_check"
  CHECK ("status" IN ('unverified', 'pending', 'active', 'rejected'));
