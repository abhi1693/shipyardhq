"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, FormProvider } from "react-hook-form"
import { toast } from "sonner"

import PageContainer from "@/components/layout/page-container"
import { updateProductAction } from "@/actions/admin/products/actions"
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
  makeEditProductSchema,
  type ProductWizardInputEdit,
} from "@/lib/productWizard/schema"
import {
  getInitialValuesFromProduct,
  toUpdatePayload,
} from "@/lib/productWizard/mappers"
import { useProductWizard } from "@/hooks/useProductWizard"
import { renderStep } from "@/components/molecules/ProductWizardStepRenderer"

const schema = makeEditProductSchema()

export type ProductWizardInput = ProductWizardInputEdit

export default function EditProductForm({
  product,
  categories,
  organizations,
}: {
  product: any
  categories: { id: string; name: string }[]
  organizations: { id: string; name: string }[]
}) {
  const router = useRouter()

  const form = useForm<ProductWizardInput>({
    resolver: zodResolver(schema),
    defaultValues: getInitialValuesFromProduct(product),
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
      router.push(`/member/products/${product.id}`)
    },
  })

  const StepComponent = useMemo(() => {
    return renderStep(wizard.step, {
      categories,
      organizations,
      productId: product.id,
    })
  }, [wizard.step, categories, organizations, product.id])

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Edit Product
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stepper */}
          <WizardStepper steps={STEPS} step={wizard.step} />

          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(wizard.onSubmit as any)}
              className="space-y-6"
            >
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

export type { ProductWizardInput as EditProductValues }
