-- Synthetic data used only in the disposable, private CI PostgreSQL container.
INSERT INTO "User" (id, "clerkId", email, "firstName", "lastName", "updatedAt")
VALUES ('smoke-owner', 'smoke-owner', 'smoke@example.invalid', 'CI', 'Fixture', now());
INSERT INTO "Category" (id, name, slug, icon, description, "updatedAt")
VALUES ('smoke-category', 'CI Fixture', 'ci-fixture', 'Box', 'Synthetic CI category', now());
INSERT INTO "Plan" (id, name, slug, type, price, "updatedAt") VALUES
('smoke-plan', 'CI Plan', 'ci-plan', 'one_time_price', 0, now()),
('smoke-other-plan', 'Other CI Plan', 'other-ci-plan', 'one_time_price', 0, now());
INSERT INTO "Product" (id, name, slug, tagline, description, "websiteUrl", logo,
  "userId", "categoryId", "planId", type, "pricingModel", status, keywords,
  platforms, "createdAt", "updatedAt", "publishedAt")
SELECT id, name, id, 'Synthetic runtime contract', 'Synthetic CI product',
  'https://example.invalid/product', 'https://example.invalid/logo.png',
  'smoke-owner', 'smoke-category', plan, 'saas', 'free', status::"ProductStatus",
  ARRAY[]::text[], ARRAY['web']::"Platform"[], created::timestamp, now(), created::timestamp
FROM (VALUES
  ('smoke-product-one', 'CI Product One', 'smoke-plan', 'published', '2026-01-01'),
  ('smoke-product-two', 'CI Product Two', 'smoke-plan', 'published', '2026-01-02'),
  ('smoke-product-draft', 'Private CI Draft', 'smoke-plan', 'draft', '2026-01-03'),
  ('smoke-product-other', 'Other Plan Product', 'smoke-other-plan', 'published', '2026-01-04')
) AS fixtures(id, name, plan, status, created);

-- Cache Components validates every dynamic route at build time. Include the
-- small, real taxonomy relationships those generateStaticParams loaders read.
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT id, "categoryId" FROM "Product";
INSERT INTO "UseCase" (id, label, slug, "updatedAt")
VALUES ('smoke-use-case', 'CI Use Case', 'ci-use-case', now());
INSERT INTO "UseCaseCategory" ("useCaseId", "categoryId")
VALUES ('smoke-use-case', 'smoke-category');
INSERT INTO "AlternativeProduct" (id, name, slug, description, "websiteUrl", "logoUrl", "updatedAt")
VALUES ('smoke-alternative', 'CI Alternative', 'ci-alternative', 'Synthetic CI alternative',
  'https://example.invalid/alternative', 'https://example.invalid/logo.png', now());
INSERT INTO "_ProductAlternativeProducts" ("A", "B")
VALUES ('smoke-alternative', 'smoke-product-two');
INSERT INTO "_AlternativeProductCategories" ("A", "B")
VALUES ('smoke-alternative', 'smoke-category');
