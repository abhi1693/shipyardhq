"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  useForm,
  FormProvider,
  useWatch,
  type UseFormReturn,
} from "react-hook-form"
import { toast } from "sonner"

import { updateProductAction } from "@/actions/admin/products/actions"
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
import {
  PaymentConnectorProvider,
  PaymentConnectorStatus,
} from "@/lib/vendor/prisma/client"
import { PaymentConnectorCard } from "../../shared/PaymentConnectorCard"

function ConnectorFields({
  form,
  connector,
}: {
  form: UseFormReturn<ProductWizardInput>
  connector: {
    provider?: PaymentConnectorProvider
    status?: PaymentConnectorStatus | null
    lastSyncedAt?: Date | string | null
    lastSyncError?: string | null
    keyHint?: string | null
  } | null
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
  const pricingModel =
    (useWatch({
      control: form.control,
      name: "pricingModel" as any,
    }) as string | undefined) ?? undefined

  if (pricingModel === "free") return null

  return (
    <PaymentConnectorCard
      provider={
        provider ??
        connector?.provider ??
        (PaymentConnectorProvider.dodo as PaymentConnectorProvider)
      }
      apiKey={apiKey ?? ""}
      keyHint={connector?.keyHint ?? null}
      status={connector?.status ?? null}
      lastSyncedAt={connector?.lastSyncedAt ?? null}
      lastSyncError={connector?.lastSyncError ?? null}
      showSaveButton={false}
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
      }}
    />
  )
}

const schema = makeEditProductSchema()

export type ProductWizardInput = ProductWizardInputEdit

export default function EditProductForm({
  product,
  categories,
  organizations,
  canEditCTA,
  alternatives,
  connector,
}: {
  product: any
  categories: { id: string; name: string }[]
  organizations: { id: string; name: string }[]
  canEditCTA: boolean
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
    lockWebsiteUrl: true,
    persistOnVerify: true,
    canEditCTA,
    enableAutofill: true,
    autofillNotice:
      "AI Autofill replaces the fields on this step with new suggestions. Your current content will be overwritten.",
    alternatives,
    pricingAside: <ConnectorFields form={form} connector={connector ?? null} />,
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
