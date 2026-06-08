-- Rename the old sticky banner reward/plan feature to partner spotlight.
-- The duplicate-safe branches handle environments where seed data already
-- created partnerSpotlight before this migration runs.

DO $$
DECLARE
  old_plan_feature_id text;
  new_plan_feature_id text;
BEGIN
  SELECT id INTO old_plan_feature_id FROM "PlanFeature" WHERE key = 'stickyBanner';
  SELECT id INTO new_plan_feature_id FROM "PlanFeature" WHERE key = 'partnerSpotlight';

  IF old_plan_feature_id IS NOT NULL AND new_plan_feature_id IS NULL THEN
    UPDATE "PlanFeature"
    SET key = 'partnerSpotlight',
        name = 'Partner Spotlight',
        description = 'Partner spotlight visibility',
        "updatedAt" = now()
    WHERE id = old_plan_feature_id;
  ELSIF old_plan_feature_id IS NOT NULL AND new_plan_feature_id IS NOT NULL THEN
    DELETE FROM "PlanFeatureAssignment" old_assignment
    USING "PlanFeatureAssignment" new_assignment
    WHERE old_assignment."featureId" = old_plan_feature_id
      AND new_assignment."featureId" = new_plan_feature_id
      AND old_assignment."planId" = new_assignment."planId";

    UPDATE "PlanFeatureAssignment"
    SET "featureId" = new_plan_feature_id,
        "updatedAt" = now()
    WHERE "featureId" = old_plan_feature_id;

    UPDATE "RewardCatalogItem"
    SET "planFeatureKey" = 'partnerSpotlight',
        "updatedAt" = now()
    WHERE "planFeatureKey" = 'stickyBanner';

    DELETE FROM "PlanFeature"
    WHERE id = old_plan_feature_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "RewardCatalogItem" WHERE "featureKey" = 'stickyBanner'
  ) AND NOT EXISTS (
    SELECT 1 FROM "RewardCatalogItem" WHERE "featureKey" = 'partnerSpotlight'
  ) THEN
    UPDATE "RewardCatalogItem"
    SET "featureKey" = 'partnerSpotlight',
        "planFeatureKey" = CASE
          WHEN EXISTS (SELECT 1 FROM "PlanFeature" WHERE key = 'partnerSpotlight')
            THEN 'partnerSpotlight'
          ELSE NULL
        END,
        name = 'Partner spotlight',
        description = 'Reserve a partner spotlight across browse and product pages for two days.',
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{surface}',
          '"partner-spotlight"'::jsonb,
          true
        ),
        "updatedAt" = now()
    WHERE "featureKey" = 'stickyBanner';
  ELSIF EXISTS (
    SELECT 1 FROM "RewardCatalogItem" WHERE "featureKey" = 'stickyBanner'
  ) AND EXISTS (
    SELECT 1 FROM "RewardCatalogItem" WHERE "featureKey" = 'partnerSpotlight'
  ) THEN
    UPDATE "RewardTransaction"
    SET "rewardKey" = 'partnerSpotlight',
        "updatedAt" = now()
    WHERE "rewardKey" = 'stickyBanner';

    UPDATE "Redemption"
    SET "featureKey" = 'partnerSpotlight',
        "updatedAt" = now()
    WHERE "featureKey" = 'stickyBanner';

    UPDATE "FeatureEntitlement"
    SET "featureKey" = 'partnerSpotlight',
        "updatedAt" = now()
    WHERE "featureKey" = 'stickyBanner';

    UPDATE "PlacementSchedule"
    SET "featureKey" = 'partnerSpotlight',
        "updatedAt" = now()
    WHERE "featureKey" = 'stickyBanner';

    DELETE FROM "RewardCatalogItem"
    WHERE "featureKey" = 'stickyBanner';
  END IF;
END $$;

UPDATE "RewardCatalogItem"
SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{surface}',
      '"partner-spotlight"'::jsonb,
      true
    ),
    "updatedAt" = now()
WHERE metadata->>'surface' = 'sticky-banner';

UPDATE "PlacementSchedule"
SET "slotKey" = replace("slotKey", 'sticky:', 'partner-spotlight:'),
    "inventoryToken" = replace("inventoryToken", 'sticky', 'partner-spotlight'),
    metadata = CASE
      WHEN metadata->>'surface' = 'sticky-banner'
        THEN jsonb_set(metadata, '{surface}', '"partner-spotlight"'::jsonb, true)
      ELSE metadata
    END,
    "updatedAt" = now()
WHERE "slotKey" LIKE 'sticky:%'
   OR "inventoryToken" LIKE '%sticky%'
   OR metadata->>'surface' = 'sticky-banner';
