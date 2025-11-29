"use client"

import { useTransition } from "react"
import type {
  PaymentConnectorProvider,
  PaymentConnectorStatus,
} from "@/lib/vendor/prisma/client/enums"
import {
  PaymentConnectorProvider as PaymentConnectorProviderEnum,
  PaymentConnectorStatus as PaymentConnectorStatusEnum,
} from "@/lib/vendor/prisma/client/enums"
import { IS_PROD } from "@/lib/constants"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Input } from "@/components/atoms/input"
import { Label } from "@/components/atoms/label"
import { Button } from "@/components/atoms/button"
import { Badge } from "@/components/atoms/badge"
import { cn } from "@/lib/utils"

type Draft = {
  provider?: PaymentConnectorProvider
  apiKey?: string
  accountId?: string
  brandId?: string
}

type Props = {
  provider?: PaymentConnectorProvider
  apiKey?: string
  accountId?: string
  brandId?: string
  keyHint?: string | null
  status?: PaymentConnectorStatus | null
  lastSyncedAt?: Date | string | null
  lastSyncError?: string | null
  onChange?: (draft: Draft) => void
  onSave?: (draft: Draft) => Promise<void>
  onReset?: () => Promise<void>
  saveLabel?: string
  readOnlyMessage?: string
  showSaveButton?: boolean
  errors?: {
    provider?: string
    apiKey?: string
    accountId?: string
    brandId?: string
  }
}

const PROVIDER_OPTIONS: { value: PaymentConnectorProvider; label: string }[] = [
  { value: PaymentConnectorProviderEnum.abacatepay, label: "AbacatePay" },
  { value: PaymentConnectorProviderEnum.creem, label: "Creem" },
  { value: PaymentConnectorProviderEnum.dodo, label: "DodoPayments" },
  { value: PaymentConnectorProviderEnum.paddle, label: "Paddle" },
  { value: PaymentConnectorProviderEnum.paystack, label: "Paystack" },
  { value: PaymentConnectorProviderEnum.polar, label: "Polar" },
  { value: PaymentConnectorProviderEnum.revenuecat, label: "RevenueCat" },
  { value: PaymentConnectorProviderEnum.stripe, label: "Stripe" },
  { value: PaymentConnectorProviderEnum.lemonsqueezy, label: "Lemon Squeezy" },
]

function renderStatus(status?: PaymentConnectorStatus | null) {
  if (!status) return null
  const intent =
    status === PaymentConnectorStatusEnum.active
      ? "success"
      : status === PaymentConnectorStatusEnum.disabled
        ? "secondary"
        : "destructive"
  return (
    <Badge
      variant={intent === "destructive" ? "destructive" : "outline"}
      className={cn(
        "text-xs",
        intent === "success" && "border-green-500 text-green-700",
        intent === "destructive" && "border-destructive/70",
      )}
    >
      {status}
    </Badge>
  )
}

export function PaymentConnectorCard({
  provider,
  apiKey,
  accountId,
  brandId,
  keyHint,
  status,
  lastSyncedAt,
  lastSyncError,
  onChange,
  onSave,
  onReset,
  saveLabel = "Save connector",
  readOnlyMessage,
  showSaveButton = true,
  errors,
}: Props) {
  const [saving, startSaving] = useTransition()
  const [resetting, startReset] = useTransition()
  const selectedProvider = provider
  const stripePrefix = IS_PROD ? "rk_live_" : "rk_test_"
  const apiKeyPlaceholder =
    selectedProvider === PaymentConnectorProviderEnum.stripe
      ? `${stripePrefix} restricted key`
      : selectedProvider === PaymentConnectorProviderEnum.abacatepay
        ? "mrr_... AbacatePay revenue token"
        : selectedProvider === PaymentConnectorProviderEnum.creem
          ? "creem_... Creem API key"
          : selectedProvider === PaymentConnectorProviderEnum.revenuecat
            ? "RevenueCat secret API key"
            : selectedProvider === PaymentConnectorProviderEnum.polar
              ? "polar_oat_... organization access token"
              : selectedProvider === PaymentConnectorProviderEnum.lemonsqueezy
                ? "Lemon Squeezy API key from Settings -> API"
                : selectedProvider === PaymentConnectorProviderEnum.paddle
                  ? "Paddle API key from Developer Tools"
                  : selectedProvider === PaymentConnectorProviderEnum.paystack
                    ? `${IS_PROD ? "sk_live_" : "sk_test_"} Paystack secret key`
                    : "Enter API secret key"
  const showStripeAccount =
    selectedProvider === PaymentConnectorProviderEnum.stripe
  const showDodoBrandId = selectedProvider === PaymentConnectorProviderEnum.dodo
  const showStripePermissions =
    selectedProvider === PaymentConnectorProviderEnum.stripe
  const showPolarPermissions =
    selectedProvider === PaymentConnectorProviderEnum.polar
  const showRevenueCatPermissions =
    selectedProvider === PaymentConnectorProviderEnum.revenuecat
  const showCreemPermissions =
    selectedProvider === PaymentConnectorProviderEnum.creem
  const showPaystackPermissions =
    selectedProvider === PaymentConnectorProviderEnum.paystack
  const showPolarOrganizationId =
    selectedProvider === PaymentConnectorProviderEnum.polar
  const showRevenueCatProject =
    selectedProvider === PaymentConnectorProviderEnum.revenuecat
  const showLemonStoreId =
    selectedProvider === PaymentConnectorProviderEnum.lemonsqueezy
  const showPaystackSubaccount =
    selectedProvider === PaymentConnectorProviderEnum.paystack
  const showLemonPermissions =
    selectedProvider === PaymentConnectorProviderEnum.lemonsqueezy
  const accountPlaceholder =
    selectedProvider === PaymentConnectorProviderEnum.stripe
      ? "acct_123..."
      : selectedProvider === PaymentConnectorProviderEnum.revenuecat
        ? "Project ID (e.g. proj_abc123)"
        : selectedProvider === PaymentConnectorProviderEnum.lemonsqueezy
          ? "Store ID (e.g. 123456)"
          : selectedProvider === PaymentConnectorProviderEnum.paystack
            ? "ACCT_... subaccount"
            : "org_..."

  const statusBadge = renderStatus(status)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold leading-tight">
            Show verified revenue
          </p>
          <p className="text-xs text-muted-foreground">
            Connect your payment provider so we can display verified revenue on
            your product page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge}
          {onReset ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              disabled={resetting || saving}
              onClick={() =>
                startReset(async () => {
                  await onReset()
                })
              }
            >
              {resetting ? "Clearing…" : "Remove config"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Provider</Label>
        <Select
          value={selectedProvider}
          onValueChange={(value) =>
            onChange?.({
              provider: value as PaymentConnectorProvider,
              apiKey,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose provider" />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.provider ? (
          <p className="text-xs text-destructive">{errors.provider}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="connector-key">
          API key{" "}
          <span className="text-xs text-muted-foreground">
            (encrypted using AES-256-GCM)
          </span>
        </Label>
        <Input
          id="connector-key"
          type="password"
          placeholder={apiKeyPlaceholder}
          value={apiKey || ""}
          onChange={(e) =>
            onChange?.({
              provider: selectedProvider,
              apiKey: e.target.value,
            })
          }
        />
        {errors?.apiKey ? (
          <p className="text-xs text-destructive">{errors.apiKey}</p>
        ) : null}
        {keyHint ? (
          <p className="text-xs text-muted-foreground">
            Key on file ending with <span className="font-mono">{keyHint}</span>
            . Enter a new key to replace.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Paste the secret key from your provider. We only keep an encrypted
            copy.
          </p>
        )}
        {selectedProvider === PaymentConnectorProviderEnum.stripe ? (
          <p className="text-xs text-muted-foreground">
            Use a Stripe restricted key starting with{" "}
            <span className="font-mono">{stripePrefix}</span> for this
            environment.
          </p>
        ) : selectedProvider === PaymentConnectorProviderEnum.abacatepay ? (
          <p className="text-xs text-muted-foreground">
            Use the read-only token from AbacatePay Apps starting with{" "}
            <span className="font-mono">mrr_</span>.
          </p>
        ) : selectedProvider === PaymentConnectorProviderEnum.creem ? (
          <p className="text-xs text-muted-foreground">
            Use a Creem API key (x-api-key) from Developers
          </p>
        ) : selectedProvider === PaymentConnectorProviderEnum.revenuecat ? (
          <p className="text-xs text-muted-foreground">
            Use a RevenueCat secret API key from Project Settings with access to
            revenue charts. Select the v2 API version in RevenueCat.
          </p>
        ) : selectedProvider === PaymentConnectorProviderEnum.polar ? (
          <p className="text-xs text-muted-foreground">
            Use a Polar organization access token starting with{" "}
            <span className="font-mono">polar_oat_</span> that can read your
            organizations, orders, and subscriptions.
          </p>
        ) : selectedProvider === PaymentConnectorProviderEnum.lemonsqueezy ? (
          <p className="text-xs text-muted-foreground">
            Use an API key from Lemon Squeezy Settings &gt; Developer &gt; API
            Keys with access to orders and subscriptions.
          </p>
        ) : selectedProvider === PaymentConnectorProviderEnum.paddle ? (
          <p className="text-xs text-muted-foreground">
            Use a Paddle API key starting with{" "}
            <span className="font-mono">
              {IS_PROD ? "pdl_live_apikey_" : "pdl_sdbx_apikey_"}
            </span>{" "}
            from Developer Tools.
          </p>
        ) : selectedProvider === PaymentConnectorProviderEnum.paystack ? (
          <p className="text-xs text-muted-foreground">
            Use a Paystack {IS_PROD ? "live" : "test"} secret key starting with{" "}
            <span className="font-mono">
              {IS_PROD ? "sk_live_" : "sk_test_"}
            </span>
            .
          </p>
        ) : null}
      </div>

      {showStripePermissions ||
      showPolarPermissions ||
      showRevenueCatPermissions ||
      showCreemPermissions ||
      showPaystackPermissions ||
      showLemonPermissions ? (
        <div className="rounded-md border border-dashed border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold text-foreground">
            {showStripePermissions
              ? "Stripe key permissions needed"
              : showPolarPermissions
                ? "Polar token permissions needed"
                : showRevenueCatPermissions
                  ? "RevenueCat key permissions needed"
                  : showCreemPermissions
                    ? "Creem key permissions needed"
                    : showPaystackPermissions
                      ? "Paystack key permissions needed"
                      : "Lemon Squeezy key permissions needed"}
          </p>
          <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
            {showStripePermissions ? (
              <>
                <li>Charges: Read</li>
                <li>Subscriptions: Read</li>
              </>
            ) : null}
            {showPolarPermissions ? (
              <>
                <li>Organizations: Read</li>
                <li>Orders: Read</li>
                <li>Subscriptions: Read</li>
              </>
            ) : null}
            {showRevenueCatPermissions ? (
              <>
                <li>Scope: customer_information:customers:read</li>
                <li>Scope: customer_information:subscriptions:read</li>
                <li>Includes verified revenue derived from subscriptions</li>
              </>
            ) : null}
            {showCreemPermissions ? (
              <>
                <li>Transactions: Read</li>
              </>
            ) : null}
            {showPaystackPermissions ? (
              <>
                <li>Transactions: Read</li>
              </>
            ) : null}
            {showLemonPermissions ? (
              <>
                <li>Orders: Read</li>
                <li>Subscriptions: Read</li>
              </>
            ) : null}
          </ul>
        </div>
      ) : null}

      {showStripeAccount ||
      showPolarOrganizationId ||
      showLemonStoreId ||
      showRevenueCatProject ||
      showPaystackSubaccount ||
      showDodoBrandId ? (
        <div className="space-y-2">
          {showDodoBrandId ? (
            <div className="space-y-2">
              <Label htmlFor="connector-brand">
                Dodo brand ID (required for Dodo)
              </Label>
              <Input
                id="connector-brand"
                placeholder="brnd_... or bus_..."
                value={brandId || ""}
                onChange={(e) =>
                  onChange?.({
                    provider: selectedProvider,
                    apiKey,
                    accountId,
                    brandId: e.target.value,
                  })
                }
              />
              {errors?.brandId ? (
                <p className="text-xs text-destructive">{errors.brandId}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Required when connecting Dodo. Scope revenue sync to a specific
                brand. Must start with <span className="font-mono">brnd_</span>
                or <span className="font-mono">bus_</span>.
              </p>
            </div>
          ) : null}

          {showStripeAccount ||
          showPolarOrganizationId ||
          showLemonStoreId ||
          showRevenueCatProject ||
          showPaystackSubaccount ? (
            <div className="space-y-2">
              <Label htmlFor="connector-account">
                {showStripeAccount
                  ? "Connected account ID (optional)"
                  : showRevenueCatProject
                    ? "RevenueCat project ID (required)"
                    : showLemonStoreId
                      ? "Lemon Squeezy store ID (required)"
                      : showPaystackSubaccount
                        ? "Paystack subaccount code (optional)"
                        : "Polar organization ID (required)"}
              </Label>
              <Input
                id="connector-account"
                placeholder={accountPlaceholder}
                value={accountId || ""}
                onChange={(e) =>
                  onChange?.({
                    provider: selectedProvider,
                    apiKey,
                    accountId: e.target.value,
                  })
                }
              />
              {errors?.accountId ? (
                <p className="text-xs text-destructive">{errors.accountId}</p>
              ) : null}
              {showStripeAccount ? (
                <p className="text-xs text-muted-foreground">
                  Provide a Stripe connected account ID to pull revenue for that
                  account. Leave blank to use the platform account only.
                </p>
              ) : showRevenueCatProject ? (
                <p className="text-xs text-muted-foreground">
                  Required. Use the project ID from RevenueCat Project Settings
                  to scope revenue to a single project.
                </p>
              ) : showLemonStoreId ? (
                <p className="text-xs text-muted-foreground">
                  Required. Use the numeric store ID from Lemon Squeezy to scope
                  revenue to a single store.
                </p>
              ) : showPaystackSubaccount ? (
                <p className="text-xs text-muted-foreground">
                  Optional. Provide a subaccount code starting with
                  <span className="font-mono"> ACCT_</span> to scope revenue to
                  that Paystack subaccount.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Required. We scope Polar API requests to this organization ID
                  to fetch revenue and subscriptions.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {lastSyncedAt ? (
        <p className="text-xs text-muted-foreground">
          Last synced: {new Date(lastSyncedAt).toLocaleString()}
        </p>
      ) : null}
      {lastSyncError ? (
        <p className="text-xs text-destructive">Last error: {lastSyncError}</p>
      ) : null}

      {onSave && showSaveButton ? (
        <Button
          type="button"
          className="w-full"
          disabled={saving || resetting}
          onClick={() =>
            startSaving(async () => {
              await onSave({
                provider: selectedProvider,
                apiKey,
                accountId,
                brandId,
              })
            })
          }
        >
          {saving ? "Saving…" : saveLabel}
        </Button>
      ) : readOnlyMessage ? (
        <p className="text-xs text-muted-foreground">{readOnlyMessage}</p>
      ) : null}
    </div>
  )
}
