/*
  Warnings:

  - The values [NATIONAL,RELIGIOUS,CULTURAL,COMPANY,OTHER] on the enum `HolidayType` will be removed. If these variants are still used in the database, this will fail.
  - The values [VACATION,PERSONAL] on the enum `LeaveType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `birthday` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GenderType" AS ENUM ('MALE', 'FEMALE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AttendanceType" ADD VALUE 'ON_LEAVE';
ALTER TYPE "AttendanceType" ADD VALUE 'HOLIDAY';
ALTER TYPE "AttendanceType" ADD VALUE 'OVERTIME';
ALTER TYPE "AttendanceType" ADD VALUE 'WORK_FROM_HOME';
ALTER TYPE "AttendanceType" ADD VALUE 'BUSINESS_TRIP';
ALTER TYPE "AttendanceType" ADD VALUE 'HALF_DAY';
ALTER TYPE "AttendanceType" ADD VALUE 'ON_LEAVE_PAID';
ALTER TYPE "AttendanceType" ADD VALUE 'UNKNOWN';

-- AlterEnum
BEGIN;
CREATE TYPE "HolidayType_new" AS ENUM ('ANNUAL_LEAVE', 'PUBLIC_HOLIDAY', 'SICK_LEAVE', 'MATERNITY_LEAVE', 'PAID_PERSONAL_LEAVE', 'UNPAID_LEAVE', 'COMPENSATORY_LEAVE', 'COMPANY_LEAVE');
ALTER TABLE "public"."Holiday" ALTER COLUMN "holiday_type" DROP DEFAULT;
ALTER TABLE "Holiday" ALTER COLUMN "holiday_type" TYPE "HolidayType_new" USING ("holiday_type"::text::"HolidayType_new");
ALTER TYPE "HolidayType" RENAME TO "HolidayType_old";
ALTER TYPE "HolidayType_new" RENAME TO "HolidayType";
DROP TYPE "public"."HolidayType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "LeaveType_new" AS ENUM ('ANNUAL', 'SICK', 'MATERNITY', 'PERSONAL_PAID', 'PERSONAL_UNPAID', 'UNPAID', 'PUBLIC_HOLIDAY', 'COMPENSATORY', 'BUSINESS_TRIP', 'WORK_FROM_HOME', 'OTHER');
ALTER TABLE "public"."LeaveRequest" ALTER COLUMN "leave_type" DROP DEFAULT;
ALTER TABLE "LeaveRequest" ALTER COLUMN "leave_type" TYPE "LeaveType_new" USING ("leave_type"::text::"LeaveType_new");
ALTER TYPE "LeaveType" RENAME TO "LeaveType_old";
ALTER TYPE "LeaveType_new" RENAME TO "LeaveType";
DROP TYPE "public"."LeaveType_old";
ALTER TABLE "LeaveRequest" ALTER COLUMN "leave_type" SET DEFAULT 'OTHER';
COMMIT;

-- AlterTable
ALTER TABLE "Holiday" ALTER COLUMN "holiday_type" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "birthday" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "gender" "GenderType" NOT NULL;
