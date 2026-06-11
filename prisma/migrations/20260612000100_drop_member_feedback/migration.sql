UPDATE "public"."RewardTransaction"
SET "ruleId" = NULL,
    "ruleKey" = NULL
WHERE "ruleKey" = 'rewards.feedback.close';

DELETE FROM "public"."RewardRule"
WHERE "key" = 'rewards.feedback.close';

DROP TABLE IF EXISTS "public"."MemberFeedback";
DROP TYPE IF EXISTS "public"."FeedbackStatus";
