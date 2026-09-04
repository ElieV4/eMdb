-- CreateTable
CREATE TABLE "festival_editions_notified" (
    "edition_qid" TEXT NOT NULL,
    "festival_nom" TEXT NOT NULL,
    "notified_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "festival_editions_notified_pkey" PRIMARY KEY ("edition_qid")
);

