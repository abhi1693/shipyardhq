-- Add new enum value for product update notifications
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'product_update';
