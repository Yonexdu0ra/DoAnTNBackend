/*
  Warnings:

  - Added the required column `description` to the `Config` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Config" ADD COLUMN     "description" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Holiday" ADD COLUMN     "user_id" TEXT;
