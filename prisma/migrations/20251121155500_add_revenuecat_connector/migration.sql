-- Add RevenueCat as a payment connector provider
ALTER TYPE "PaymentConnectorProvider" ADD VALUE IF NOT EXISTS 'revenuecat';
