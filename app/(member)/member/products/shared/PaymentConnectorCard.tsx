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
}

type Props = {
  provider?: PaymentConnectorProvider
  apiKey?: string
  accountId?: string
  keyHint?: string | null
  status?: PaymentConnectorStatus | null
  lastSyncedAt?: Date | string | null
  lastSyncError?: string | null
  onChange?: (draft: Draft) => void
  onSave?: (draft: Draft) => Promise<void>
  saveLabel?: string
  readOnlyMessage?: string
  showSaveButton?: boolean
}

const PROVIDER_OPTIONS: { value: PaymentConnectorProvider; label: string }[] = [
  { value: PaymentConnectorProviderEnum.dodo, label: "DodoPayments" },
  { value: PaymentConnectorProviderEnum.polar, label: "Polar" },
  { value: PaymentConnectorProviderEnum.stripe, label: "Stripe" },
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
  keyHint,
  status,
  lastSyncedAt,
  lastSyncError,
  onChange,
  onSave,
  saveLabel = "Save connector",
  readOnlyMessage,
  showSaveButton = true,
}: Props) {
  const [saving, startTransition] = useTransition()
  const selectedProvider =
    provider ??
    PROVIDER_OPTIONS.find(
      (opt) => opt.value === PaymentConnectorProviderEnum.dodo,
    )?.value
  const stripePrefix = IS_PROD ? "rk_live_" : "rk_test_"
  const stripePlaceholder =
    selectedProvider === PaymentConnectorProviderEnum.stripe
      ? `${stripePrefix} restricted key`
      : "Enter API secret key"
  const showStripeAccount =
    selectedProvider === PaymentConnectorProviderEnum.stripe

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
        {renderStatus(status)}
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="connector-key">
          API key{" "}
          <span className="text-xs text-muted-foreground">
            (never stored in plain text)
          </span>
        </Label>
        <Input
          id="connector-key"
          type="password"
          placeholder={stripePlaceholder}
          value={apiKey || ""}
          onChange={(e) =>
            onChange?.({
              provider: selectedProvider,
              apiKey: e.target.value,
            })
          }
        />
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
        ) : null}
      </div>

      {showStripeAccount ? (
        <div className="space-y-2">
          <Label htmlFor="connector-account">Connected account ID (optional)</Label>
          <Input
            id="connector-account"
            placeholder="acct_123..."
            value={accountId || ""}
            onChange={(e) =>
              onChange?.({
                provider: selectedProvider,
                apiKey,
                accountId: e.target.value,
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Provide a Stripe connected account ID to pull revenue for that
            account. Leave blank to use the platform account only.
          </p>
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
          disabled={saving}
          onClick={() =>
            startTransition(async () => {
              await onSave({
                provider: selectedProvider,
                apiKey,
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
