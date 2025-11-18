-- CreateEnum
CREATE TYPE "PaymentConnectorProvider" AS ENUM ('dodo', 'stripe');

-- CreateEnum
CREATE TYPE "PaymentConnectorStatus" AS ENUM ('active', 'disabled', 'error');

-- CreateEnum
CREATE TYPE "PaymentCredentialStatus" AS ENUM ('active', 'revoked', 'expired');

-- CreateTable
CREATE TABLE "PaymentConnector" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "provider" "PaymentConnectorProvider" NOT NULL,
    "status" "PaymentConnectorStatus" NOT NULL DEFAULT 'active',
    "config" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "latestAllTimeRevenueCents" INTEGER,
    "latestMrrCents" INTEGER,
    "latestCurrencyCode" TEXT,
    "latestPeriodStart" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentConnector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentConnectorCredential" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "status" "PaymentCredentialStatus" NOT NULL DEFAULT 'active',
    "encryptionVersion" INTEGER NOT NULL DEFAULT 1,
    "encryptedKey" TEXT NOT NULL,
    "keyHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentConnectorCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRevenueSnapshot" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodRevenueCents" INTEGER NOT NULL DEFAULT 0,
    "allTimeRevenueCents" INTEGER NOT NULL DEFAULT 0,
    "mrrCents" INTEGER,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRevenueSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentConnector_productId_updatedAt_idx" ON "PaymentConnector"("productId", "updatedAt");

-- CreateIndex
CREATE INDEX "PaymentConnector_status_updatedAt_idx" ON "PaymentConnector"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentConnector_productId_key" ON "PaymentConnector"("productId");

-- CreateIndex
CREATE INDEX "PaymentConnectorCredential_connectorId_status_idx" ON "PaymentConnectorCredential"("connectorId", "status");

-- CreateIndex
CREATE INDEX "PaymentConnectorCredential_createdAt_idx" ON "PaymentConnectorCredential"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentRevenueSnapshot_connectorId_periodStart_idx" ON "PaymentRevenueSnapshot"("connectorId", "periodStart");

-- CreateIndex
CREATE INDEX "PaymentRevenueSnapshot_createdAt_idx" ON "PaymentRevenueSnapshot"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRevenueSnapshot_connectorId_periodStart_currencyCode_key" ON "PaymentRevenueSnapshot"("connectorId", "periodStart", "currencyCode");

-- AddForeignKey
ALTER TABLE "PaymentConnector" ADD CONSTRAINT "PaymentConnector_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentConnectorCredential" ADD CONSTRAINT "PaymentConnectorCredential_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "PaymentConnector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRevenueSnapshot" ADD CONSTRAINT "PaymentRevenueSnapshot_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "PaymentConnector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
