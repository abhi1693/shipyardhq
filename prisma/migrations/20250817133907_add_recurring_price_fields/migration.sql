-- CreateEnum
CREATE TYPE "public"."TimeInterval" AS ENUM ('day', 'week', 'month', 'year');

-- AlterEnum
ALTER TYPE "public"."PlanType" ADD VALUE 'recurring_price';

-- AlterTable
ALTER TABLE "public"."Plan" ADD COLUMN     "paymentFrequencyCount" INTEGER,
ADD COLUMN     "paymentFrequencyInterval" "public"."TimeInterval",
ADD COLUMN     "subscriptionPeriodCount" INTEGER,
ADD COLUMN     "subscriptionPeriodInterval" "public"."TimeInterval";
