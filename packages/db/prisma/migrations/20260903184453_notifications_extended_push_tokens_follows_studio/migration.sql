-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "message" TEXT,
ADD COLUMN     "related_user_id" UUID,
ADD COLUMN     "title_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows_studio" (
    "user_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "followed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_studio_pkey" PRIMARY KEY ("user_id","studio_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_push_tokens_user" ON "push_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_follows_studio_studio" ON "user_follows_studio"("studio_id");

-- CreateIndex
CREATE INDEX "idx_notifications_title" ON "notifications"("title_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_user_id_fkey" FOREIGN KEY ("related_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_follows_studio" ADD CONSTRAINT "user_follows_studio_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_follows_studio" ADD CONSTRAINT "user_follows_studio_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

