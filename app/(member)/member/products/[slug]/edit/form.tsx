"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  useForm,
  FormProvider,
  useWatch,
  type UseFormReturn,
  useFormState,
} from "react-hook-form"
import { toast } from "sonner"

import {
  resetProductConnectorAction,
  updateProductAction,
} from "@/actions/admin/products/actions"
import { Card, CardContent } from "@/components/atoms/card"

import WizardStepper from "@/components/molecules/WizardStepper"
import WizardFooter from "@/components/molecules/WizardFooter"
import { STEPS, STEP_FIELDS } from "@/lib/productWizard/constants"
import { validateExternalResources as validateResources } from "@/lib/productWizard/validate"
import {
  makeEditProductSchema,
  type ProductWizardInputEdit,
} from "@/lib/productWizard/schema"
import {
  getInitialValuesFromProduct,
  toUpdatePayload,
} from "@/lib/productWizard/mappers"
import { useProductWizard } from "@/hooks/useProductWizard"
import { renderStep } from "@/components/molecules/ProductWizardStepRenderer"
import { memberProductPath } from "@/lib/routes"
import type {
  PaymentConnectorProvider,
  PaymentConnectorStatus,
} from "@/lib/vendor/prisma/client/enums"
import { PaymentConnectorCard } from "../../shared/PaymentConnectorCard"

function ConnectorFields({
  form,
  connector,
  productId,
}: {
  form: UseFormReturn<ProductWizardInput>
  connector: {
    provider?: PaymentConnectorProvider
    status?: PaymentConnectorStatus | null
    lastSyncedAt?: Date | string | null
    lastSyncError?: string | null
    keyHint?: string | null
  } | null
  productId: string
}) {
  const provider = useWatch({
    control: form.control,
    name: "connectorProvider" as any,
  }) as PaymentConnectorProvider | undefined
  const { errors } = useFormState({ control: form.control })
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

  const [connectorState, setConnectorState] = useState(connector)
  const lockedProvider = connectorState?.provider

  return (
    <PaymentConnectorCard
      provider={provider ?? connectorState?.provider}
      apiKey={apiKey ?? ""}
      accountId={accountId ?? ""}
      brandId={brandId ?? ""}
      keyHint={connectorState?.keyHint ?? null}
      status={connectorState?.status ?? null}
      lastSyncedAt={connectorState?.lastSyncedAt ?? null}
      lastSyncError={connectorState?.lastSyncError ?? null}
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
      onReset={
        connectorState
          ? async () => {
              const res = await resetProductConnectorAction(productId)
              if ((res as any)?.error) {
                toast.error((res as any).error)
                return
              }
              form.setValue("connectorProvider" as any, undefined as any, {
                shouldDirty: true,
                shouldValidate: true,
              })
              form.setValue("connectorApiKey" as any, "", {
                shouldDirty: true,
                shouldValidate: true,
              })
              form.setValue("connectorAccountId" as any, "", {
                shouldDirty: true,
                shouldValidate: true,
              })
              form.setValue("connectorBrandId" as any, "", {
                shouldDirty: true,
                shouldValidate: true,
              })
              setConnectorState(null)
              toast.success(
                "Removed connector configuration. Enter new details to reconnect.",
              )
            }
          : undefined
      }
    />
  )
}

const schema = makeEditProductSchema()

export type ProductWizardInput = ProductWizardInputEdit

export default function EditProductForm({
  product,
  categories,
  organizations,
  alternatives,
  connector,
}: {
  product: any
  categories: { id: string; name: string; icon?: string | null }[]
  organizations: { id: string; name: string }[]
  alternatives: {
    id: string
    slug?: string | null
    name: string
    websiteUrl?: string | null
  }[]
  connector?: {
    id: string
    provider: PaymentConnectorProvider
    status: PaymentConnectorStatus | null
    lastSyncedAt?: Date | string | null
    lastSyncError?: string | null
    keyHint?: string | null
    accountId?: string | null
    brandId?: string | null
  } | null
}) {
  const router = useRouter()

  const form = useForm<ProductWizardInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: getInitialValuesFromProduct(product, connector || undefined),
    mode: "onBlur",
  })

  const wizard = useProductWizard<ProductWizardInput>({
    form,
    steps: STEPS,
    stepFields: STEP_FIELDS,
    validateExternal: async () => {
      const v = form.getValues() as any
      const { issues, checks } = await validateResources(v)
      form.setValue("reviewIssues" as any, issues)
      form.setValue("reviewChecks" as any, checks)
      if (issues.length) {
        toast.error("Some links/images look invalid. Please review.")
        return false
      }
      return true
    },
    onSubmit: async (values) => {
      const payload = toUpdatePayload(values as any, product)
      const res = await updateProductAction(product.id, payload)
      if ((res as any)?.error) {
        toast.error((res as any).error)
        return
      }
      toast.success("Product updated successfully")
      router.push(memberProductPath(product.slug))
    },
  })

  const StepComponent = renderStep(wizard.step, {
    categories,
    organizations,
    productId: product.id,
    productSlug: product.slug,
    galleryMedia:
      product.ProductMedia?.map((m: any) => ({
        id: m.id,
        imageUrl: m.imageUrl,
      })) ?? [],
    canEditGallery: true,
    maxGallery: 6,
    lockWebsiteUrl: true,
    persistOnVerify: true,
    enableAutofill: true,
    autofillNotice:
      "AI Autofill replaces the fields on this step with new suggestions. Your current content will be overwritten.",
    alternatives,
    pricingAside: (
      <ConnectorFields
        form={form}
        connector={connector ?? null}
        productId={product.id}
      />
    ),
  })

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Edit product
          </h1>
          <p className="text-sm text-muted-foreground">
            Update launch details, media, and verification settings.
          </p>
        </div>
      </div>

      <Card className="border border-transparent bg-white/90 shadow-none">
        <CardContent className="space-y-6 px-0">
          <WizardStepper steps={STEPS} step={wizard.step} />

          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(() =>
                wizard.submitWithStatus("published"),
              )}
              className="space-y-6"
            >
              {StepComponent}

              <WizardFooter
                isReview={wizard.isReview}
                onBack={wizard.back}
                onNext={wizard.next}
                onSaveDraft={() => wizard.submitWithStatus("draft")}
                onPublish={() => wizard.submitWithStatus("published")}
                disableBack={wizard.step === 1}
                isSubmitting={form.formState.isSubmitting}
              />
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  )
}

export type { ProductWizardInput as EditProductValues }
