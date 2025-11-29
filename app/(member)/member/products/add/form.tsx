"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  useForm,
  FormProvider,
  useWatch,
  type UseFormReturn,
  useFormState,
} from "react-hook-form"
import { toast } from "sonner"
import { MEMBER_PRODUCTS_PATH, memberProductUpgradePath } from "@/lib/routes"

import { createProductAction } from "@/actions/admin/products/actions"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Separator } from "@/components/atoms/separator"

import WizardStepper from "@/components/molecules/WizardStepper"
import WizardFooter from "@/components/molecules/WizardFooter"
import { STEPS, STEP_FIELDS } from "@/lib/productWizard/constants"
import { validateExternalResources as validateResources } from "@/lib/productWizard/validate"
import {
  makeAddProductSchema,
  type ProductWizardInputAdd,
} from "@/lib/productWizard/schema"
import {
  getInitialValuesForAdd,
  toCreateFormData,
} from "@/lib/productWizard/mappers"
import { useProductWizard } from "@/hooks/useProductWizard"
import { renderStep } from "@/components/molecules/ProductWizardStepRenderer"
import type { PaymentConnectorProvider as PaymentConnectorProviderType } from "@/lib/vendor/prisma/client/enums"
import { PaymentConnectorCard } from "../shared/PaymentConnectorCard"

function ConnectorFields({
  form,
}: {
  form: UseFormReturn<ProductWizardInput>
}) {
  const { errors } = useFormState({ control: form.control })
  const provider = useWatch({
    control: form.control,
    name: "connectorProvider" as any,
  }) as PaymentConnectorProviderType | undefined
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

  return (
    <PaymentConnectorCard
      provider={provider}
      apiKey={apiKey ?? ""}
      accountId={accountId ?? ""}
      brandId={brandId ?? ""}
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
    />
  )
}

const schema = makeAddProductSchema()

export type ProductWizardInput = ProductWizardInputAdd

export default function AddProductForm({
  categories,
  organizations,
  userId,
  alternatives,
}: {
  categories: { id: string; name: string }[]
  organizations: { id: string; name: string }[]
  userId: string
  alternatives: {
    id: string
    slug?: string | null
    name: string
    websiteUrl?: string | null
  }[]
}) {
  const router = useRouter()
  const [newProductId] = useState(() => {
    const g: any = typeof globalThis !== "undefined" ? (globalThis as any) : {}
    const c = g.crypto as Crypto | undefined
    if (c && typeof (c as any).randomUUID === "function") {
      return (c as any).randomUUID()
    }
    // Fallback: pseudo-uuid
    const rand = () => Math.random().toString(36).slice(2, 10)
    return `prod_${Date.now().toString(36)}_${rand()}_${rand()}`
  })
  const form = useForm<ProductWizardInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: getInitialValuesForAdd(),
    mode: "onBlur",
  })

  async function submitAll(
    values: ProductWizardInput & { status?: "draft" | "published" },
  ) {
    try {
      const fd = toCreateFormData(values, userId, newProductId)
      const result = await createProductAction(fd)
      if ((result as any)?.error) {
        toast.error((result as any).error)
        return
      }
      toast.success("Product created successfully!")
      const slug = (result as any)?.slug
      if (slug) {
        router.push(memberProductUpgradePath(slug))
        return
      }
      router.push(MEMBER_PRODUCTS_PATH)
    } catch (e: any) {
      toast.error(e?.message || "Failed to create product")
    }
  }

  const wizard = useProductWizard<ProductWizardInput>({
    form,
    steps: STEPS,
    stepFields: STEP_FIELDS,
    validateExternal: async () => {
      const v = form.getValues()
      const { issues, checks } = await validateResources(v as any)
      form.setValue("reviewIssues" as any, issues)
      form.setValue("reviewChecks" as any, checks)
      if (issues.length) {
        toast.error("Some links/images look invalid. Please review.")
        return false
      }
      return true
    },
    onSubmit: submitAll as any,
  })

  const StepComponent = renderStep(wizard.step, {
    categories,
    organizations,
    productId: newProductId,
    persistOnVerify: false,
    enableAutofill: true,
    alternatives,
    pricingAside: <ConnectorFields form={form} />,
  })

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="text-left text-2xl font-bold">
          Add Product
        </CardTitle>
      </CardHeader>
      <CardContent>
        <WizardStepper steps={STEPS} step={wizard.step} />

        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(() =>
              wizard.submitWithStatus("published"),
            )}
            className="space-y-6"
          >
            {/* Steps */}
            {StepComponent}

            <Separator className="my-4" />

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
  )
}

export type { ProductWizardInput as AddProductValues }
