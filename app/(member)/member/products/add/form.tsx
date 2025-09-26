"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, FormProvider } from "react-hook-form"
import { toast } from "sonner"
import { MEMBER_PRODUCTS_PATH, memberProductPath } from "@/lib/routes"

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

const schema = makeAddProductSchema()

export type ProductWizardInput = ProductWizardInputAdd

export default function AddProductForm({
  categories,
  organizations,
  userId,
  canEditCTA,
}: {
  categories: { id: string; name: string }[]
  organizations: { id: string; name: string }[]
  userId: string
  canEditCTA: boolean
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
        router.push(`${memberProductPath(slug)}?celebrate=1`)
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

  const StepComponent = useMemo(() => {
    return renderStep(wizard.step, {
      categories,
      organizations,
      productId: newProductId,
      persistOnVerify: false,
      canEditCTA,
      enableAutofill: true,
    })
  }, [wizard.step, categories, organizations, newProductId, canEditCTA])

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
