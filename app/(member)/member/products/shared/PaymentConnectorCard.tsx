"use client"

import { useTransition } from "react"
import {
  PaymentConnectorProvider,
  PaymentConnectorStatus,
} from "@/lib/vendor/prisma/client"
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
}

type Props = {
  provider?: PaymentConnectorProvider
  apiKey?: string
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
  { value: PaymentConnectorProvider.dodo, label: "DodoPayments" },
]

function renderStatus(status?: PaymentConnectorStatus | null) {
  if (!status) return null
  const intent =
    status === PaymentConnectorStatus.active
      ? "success"
      : status === PaymentConnectorStatus.disabled
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
    PROVIDER_OPTIONS.find((opt) => opt.value === PaymentConnectorProvider.dodo)
      ?.value

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold leading-tight">
            Show verified revenue
          </p>
          <p className="text-xs text-muted-foreground">
            Connect your billing provider so we can display verified revenue on your product page.
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
          API key <span className="text-xs text-muted-foreground">(never stored in plain text)</span>
        </Label>
        <Input
          id="connector-key"
          type="password"
        placeholder="Enter API secret key"
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
            Key on file ending with <span className="font-mono">{keyHint}</span>. Enter a new key to replace.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Paste the secret key from your provider. We only keep an encrypted copy.
          </p>
        )}
      </div>

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
      ) : (
        readOnlyMessage ? (
          <p className="text-xs text-muted-foreground">{readOnlyMessage}</p>
        ) : null
      )}
    </div>
  )
}
