"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, FormProvider } from "react-hook-form"
import { toast } from "sonner"

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
import ProductBadgeCelebrationDialog from "@/components/molecules/ProductBadgeCelebrationDialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Label } from "@/components/atoms/label"
import { adminPath, productPath } from "@/lib/routes"

const schema = makeAddProductSchema()

export type ProductWizardInput = ProductWizardInputAdd

export default function AddProductForm({
  categories,
  organizations,
  users,
}: {
  categories: { id: string; name: string }[]
  organizations: { id: string; name: string }[]
  users: { id: string; email: string }[]
}) {
  const router = useRouter()
  const [ownerId, setOwnerId] = useState("")
  const [showCelebration, setShowCelebration] = useState(false)
  const [isCompletionPending, setIsCompletionPending] = useState(false)
  const [celebrationProductSlug, setCelebrationProductSlug] = useState<
    string | null
  >(null)

  const [newProductId] = useState(() => {
    const g: any = typeof globalThis !== "undefined" ? (globalThis as any) : {}
    const c = g.crypto as Crypto | undefined
    if (c && typeof (c as any).randomUUID === "function") {
      return (c as any).randomUUID()
    }
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
    if (!ownerId) {
      toast.error("Please select an owner")
      return
    }
    const fd = toCreateFormData(values as any, ownerId, newProductId)
    const result = await createProductAction(fd)
    if ((result as any)?.error) {
      toast.error((result as any).error)
      return
    }
    const nextSlug =
      typeof (result as any)?.slug === "string" && (result as any).slug.length
        ? (result as any).slug
        : null
    setCelebrationProductSlug(nextSlug)
    toast.success("Product created successfully!")
    setIsCompletionPending(true)
    setShowCelebration(true)
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
    const ownerNode = (
      <div>
        <Label>Owner (user)</Label>
        <Select value={ownerId} onValueChange={setOwnerId}>
          <SelectTrigger>
            <SelectValue placeholder="Select owner" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
    return renderStep(wizard.step, {
      categories,
      organizations,
      productId: newProductId,
      persistOnVerify: false,
      canEditCTA: true,
      rightOfWebsite: ownerId ? ownerNode : ownerNode,
      enableAutofill: true,
    })
  }, [wizard.step, categories, organizations, newProductId, ownerId, users])

  return (
    <>
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Add Product
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WizardStepper steps={STEPS} step={wizard.step} />

          {/* Admin-only owner control is inlined on Step 1 via rightOfWebsite */}

          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(() =>
                wizard.submitWithStatus("published"),
              )}
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

      <ProductBadgeCelebrationDialog
        open={showCelebration}
        onOpenChange={(open) => {
          setShowCelebration(open)
          if (!open) {
            setCelebrationProductSlug(null)
            if (isCompletionPending) {
              setIsCompletionPending(false)
              router.push(adminPath("products"))
            }
          }
        }}
        productPublicPath={
          celebrationProductSlug
            ? productPath(celebrationProductSlug)
            : undefined
        }
      />
    </>
  )
}
