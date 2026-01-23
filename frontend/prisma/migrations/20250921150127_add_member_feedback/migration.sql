-- CreateEnum
CREATE TYPE "public"."FeedbackStatus" AS ENUM ('received', 'in_review', 'closed');

-- CreateTable
CREATE TABLE "public"."MemberFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "rating" INTEGER,
    "status" "public"."FeedbackStatus" NOT NULL DEFAULT 'received',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberFeedback_userId_createdAt_idx" ON "public"."MemberFeedback"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."MemberFeedback" ADD CONSTRAINT "MemberFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
