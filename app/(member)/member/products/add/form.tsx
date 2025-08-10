"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, FormProvider } from "react-hook-form"
import { toast } from "sonner"

import PageContainer from "@/components/layout/page-container"
import { createProductAction } from "@/actions/admin/products/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Separator } from "@/components/atoms/separator"

import WizardStepper from "@/components/molecules/WizardStepper"
import WizardFooter from "@/components/molecules/WizardFooter"
import { STEPS, STEP_FIELDS } from "@/lib/productWizard/constants"
import { validateExternalResources as validateResources } from "@/lib/productWizard/validate"
import { makeAddProductSchema, type ProductWizardInputAdd } from "@/lib/productWizard/schema"
import { getInitialValuesForAdd, toCreateFormData } from "@/lib/productWizard/mappers"
import { useProductWizard } from "@/hooks/useProductWizard"
import { renderStep } from "@/components/molecules/ProductWizardStepRenderer"

const schema = makeAddProductSchema()

export type ProductWizardInput = ProductWizardInputAdd

export default function AddProductForm({
  categories,
  organizations,
  userId,
}: {
  categories: { id: string; name: string }[]
  organizations: { id: string; name: string }[]
  userId: string
}) {
  const router = useRouter()

  const form = useForm<ProductWizardInput>({
    resolver: zodResolver(schema),
    defaultValues: getInitialValuesForAdd(),
    mode: "onBlur",
  })

  async function submitAll(values: ProductWizardInput & { status?: "draft" | "published" }) {
    try {
      const fd = toCreateFormData(values, userId)
      const result = await createProductAction(fd)
      if ((result as any)?.error) {
        toast.error((result as any).error)
        return
      }
      toast.success("Product created successfully!")
      router.push("/member/products")
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
    onSubmit: submitAll,
  })

  const StepComponent = useMemo(() => {
    return renderStep(wizard.step, { categories, organizations })
  }, [wizard.step, categories, organizations])

  return (
    <PageContainer>
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
              onSubmit={form.handleSubmit(wizard.onSubmit as any)}
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
    </PageContainer>
  )
}

export type { ProductWizardInput as AddProductValues }
