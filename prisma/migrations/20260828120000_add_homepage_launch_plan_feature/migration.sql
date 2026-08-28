INSERT INTO "PlanFeature" (
  "id",
  "name",
  "displayName",
  "key",
  "description",
  "createdAt",
  "updatedAt"
)
VALUES (
  'plan_feature_homepage_launch',
  'Homepage Launch of the Day',
  'Homepage Launch of the Day slot',
  'homepageLaunch',
  'Eligibility for the sponsored homepage launch slot',
  now(),
  now()
)
ON CONFLICT ("key") DO UPDATE
SET "name" = EXCLUDED."name",
    "displayName" = EXCLUDED."displayName",
    "description" = EXCLUDED."description",
    "updatedAt" = now();

INSERT INTO "PlanFeatureAssignment" (
  "id",
  "planId",
  "featureId",
  "enabled",
  "isExperimental",
  "config",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(plan."id" || ':homepageLaunch'),
  plan."id",
  feature."id",
  true,
  false,
  NULL,
  now(),
  now()
FROM "Plan" plan
CROSS JOIN "PlanFeature" feature
WHERE plan."slug" IN ('pro', 'pro-recurring')
  AND feature."key" = 'homepageLaunch'
ON CONFLICT ("planId", "featureId") DO UPDATE
SET "enabled" = true,
    "isExperimental" = false,
    "updatedAt" = now();
