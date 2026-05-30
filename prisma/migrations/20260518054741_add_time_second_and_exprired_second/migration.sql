-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "expired_seconds" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "ronate_seconds" INTEGER NOT NULL DEFAULT 5;
