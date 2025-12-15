"use client"

import { useWatch, useFormState, type UseFormReturn } from "react-hook-form"

import { PaymentConnectorCard } from "@/app/(member)/member/products/shared/PaymentConnectorCard"
import type {
  PaymentConnectorProvider,
  PaymentConnectorStatus,
} from "@/lib/vendor/prisma/client/enums"

export default function ProductConnectorFields({
  form,
  providerFallback,
  lockedProvider,
  keyHint,
  status,
  lastSyncedAt,
  lastSyncError,
  onReset,
}: {
  form: UseFormReturn<any>
  providerFallback?: PaymentConnectorProvider
  lockedProvider?: PaymentConnectorProvider
  keyHint?: string | null
  status?: PaymentConnectorStatus | null
  lastSyncedAt?: Date | string | null
  lastSyncError?: string | null
  onReset?: () => Promise<void>
}) {
  const provider = useWatch({
    control: form.control,
    name: "connectorProvider" as any,
  }) as PaymentConnectorProvider | undefined
  const apiKey =
    (useWatch({
      control: form.control,
      name: "connectorApiKey" as any,
    }) as string | undefined) ?? ""
  const accountId =
    (useWatch({
      control: form.control,
      name: "connectorAccountId" as any,
    }) as string | undefined) ?? ""
  const brandId =
    (useWatch({
      control: form.control,
      name: "connectorBrandId" as any,
    }) as string | undefined) ?? ""

  const { errors } = useFormState({ control: form.control })

  return (
    <PaymentConnectorCard
      provider={provider ?? providerFallback}
      apiKey={apiKey ?? ""}
      accountId={accountId ?? ""}
      brandId={brandId ?? ""}
      keyHint={keyHint ?? null}
      status={status ?? null}
      lastSyncedAt={lastSyncedAt ?? null}
      lastSyncError={lastSyncError ?? null}
      showSaveButton={false}
      lockedProvider={lockedProvider}
      onChange={(draft) => {
        if (draft.provider) {
          form.setValue("connectorProvider" as any, draft.provider, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        if (draft.apiKey !== undefined) {
          form.setValue("connectorApiKey" as any, draft.apiKey ?? "", {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        if (draft.accountId !== undefined) {
          form.setValue("connectorAccountId" as any, draft.accountId ?? "", {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        if (draft.brandId !== undefined) {
          form.setValue("connectorBrandId" as any, draft.brandId ?? "", {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      }}
      errors={{
        provider: (errors as any)?.connectorProvider?.message as
          | string
          | undefined,
        apiKey: (errors as any)?.connectorApiKey?.message as string | undefined,
        accountId: (errors as any)?.connectorAccountId?.message as
          | string
          | undefined,
        brandId: (errors as any)?.connectorBrandId?.message as
          | string
          | undefined,
      }}
      onReset={onReset}
    />
  )
}

