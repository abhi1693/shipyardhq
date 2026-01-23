-- Add timestamp to track when a plan was attached to a product
ALTER TABLE "Product" ADD COLUMN "planAssignedAt" TIMESTAMP(3);
