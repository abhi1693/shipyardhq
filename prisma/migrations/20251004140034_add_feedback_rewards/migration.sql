-- AlterTable
ALTER TABLE "MemberFeedback" ADD COLUMN     "rewardEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rewardGrantedAt" TIMESTAMP(3);
