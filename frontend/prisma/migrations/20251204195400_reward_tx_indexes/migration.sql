-- Add composite indexes to speed up reward cooldown and cap checks
CREATE INDEX "RewardTransaction_user_rule_type_createdAt_idx"
  ON "RewardTransaction" ("userId", "ruleKey", "type", "createdAt");

CREATE INDEX "RewardTransaction_user_rule_target_type_createdAt_idx"
  ON "RewardTransaction" ("userId", "ruleKey", "targetId", "type", "createdAt");
