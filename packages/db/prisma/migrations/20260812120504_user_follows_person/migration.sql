-- CreateTable
CREATE TABLE "user_follows_person" (
    "user_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "followed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_person_pkey" PRIMARY KEY ("user_id","person_id")
);

-- CreateIndex
CREATE INDEX "idx_follows_person_person" ON "user_follows_person"("person_id");

-- AddForeignKey
ALTER TABLE "user_follows_person" ADD CONSTRAINT "user_follows_person_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_follows_person" ADD CONSTRAINT "user_follows_person_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

