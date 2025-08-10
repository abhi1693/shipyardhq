"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, FormProvider } from "react-hook-form"
import { toast } from "sonner"

import PageContainer from "@/components/layout/page-container"
import { updateProductAction } from "@/actions/admin/products/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import { Separator } from "@/components/atoms/separator"

import Step1 from "../../shared/step1"
import Step2 from "../../shared/step2"
import Step3 from "../../shared/step3"
import Step4 from "../../shared/step4"
import Review from "../../shared/review"
import WizardStepper from "@/components/molecules/WizardStepper"
import { PRODUCT_TYPES, PRICING_MODELS, PLATFORMS, STEPS, STEP_FIELDS } from "@/lib/productWizard/constants"
import { validateExternalResources as validateResources } from "@/lib/productWizard/validate"

const schema = z.object({
  // Basics
  name: z.string().min(1, "Name is required"),
  tagline: z.string().min(1, "Tagline is required"),
  description: z.string().min(1, "Description is required"),
  websiteUrl: z.string().url("Valid URL required"),
  logo: z.string().url("Valid logo URL required"),
  categoryId: z.string().min(1, "Category is required"),
  type: z.enum(PRODUCT_TYPES, { required_error: "Select a product type" }),
  platforms: z.array(z.enum(PLATFORMS)).default([]),
  keywordsText: z.string().optional().default(""),

  // Pricing
  pricingModel: z.enum(PRICING_MODELS, {
    required_error: "Select a pricing model",
  }),
  startingPriceCents: z
    .number({ invalid_type_error: "Enter a valid number" })
    .int("Must be an integer")
    .nonnegative("Cannot be negative")
    .nullable()
    .optional(),
  currencyCode: z
    .string()
    .regex(/^[A-Z]{3}$/i, "3-letter code, e.g. USD")
    .nullable()
    .optional(),

  // Optional marketing/org
  organizationId: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().url().optional().or(z.literal("")),
  bannerImage: z.string().url().optional().or(z.literal("")),

  // Metadata
  githubUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  demoUrl: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived"]).optional(),

  // Verification (client-side check state)
  verificationExpectedTxt: z.string().optional(),
  verificationChecked: z.boolean().optional(),
  verificationSuccess: z.boolean().optional(),

  // Review checks state
  reviewIssues: z.array(z.string()).optional(),
  reviewChecks: z
    .object({
      websiteOk: z.boolean().optional(),
      logoOk: z.boolean().optional(),
      bannerOk: z.boolean().optional(),
      ctaOk: z.boolean().optional(),
      githubOk: z.boolean().optional(),
      twitterOk: z.boolean().optional(),
      demoOk: z.boolean().optional(),
    })
    .optional(),
})
  .superRefine((val, ctx) => {
    // Pricing dependencies
    const pm = val.pricingModel
    const hasPrice = val.startingPriceCents != null && val.startingPriceCents !== undefined
    const hasCurrency = !!val.currencyCode
    if (pm === "subscription" || pm === "one_time") {
      if (!hasPrice) {
        ctx.addIssue({
          path: ["startingPriceCents"],
          code: z.ZodIssueCode.custom,
          message: "Price required for this model",
        })
      }
      if (!hasCurrency) {
        ctx.addIssue({
          path: ["currencyCode"],
          code: z.ZodIssueCode.custom,
          message: "Currency required",
        })
      }
    }
    if (pm === "free" || pm === "custom") {
      if (hasPrice) {
        ctx.addIssue({
          path: ["startingPriceCents"],
          code: z.ZodIssueCode.custom,
          message: "Should be empty for free/custom",
        })
      }
      if (hasCurrency) {
        ctx.addIssue({
          path: ["currencyCode"],
          code: z.ZodIssueCode.custom,
          message: "Should be empty for free/custom",
        })
      }
    }
  })

export type ProductWizardInput = z.infer<typeof schema>

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
  const [step, setStep] = useState<number>(1)

  const form = useForm<ProductWizardInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product.name,
      tagline: product.tagline ?? "",
      description: product.description ?? "",
      websiteUrl: product.websiteUrl ?? "",
      logo: product.logo ?? "",
      categoryId: product.categoryId,
      type: product.type,
      pricingModel: product.pricingModel,
      startingPriceCents: product.startingPriceCents ?? undefined,
      currencyCode: product.currencyCode ?? undefined,
      platforms: product.platforms ?? [],
      keywordsText: (product.keywords ?? []).join(", "),
      organizationId: product.organizationId ?? "",
      ctaLabel: product.ctaLabel ?? "",
      ctaUrl: product.ctaUrl ?? "",
      bannerImage: product.bannerImage ?? "",
      githubUrl: product.metadata?.githubUrl ?? "",
      twitterUrl: product.metadata?.twitterUrl ?? "",
      demoUrl: product.metadata?.demoUrl ?? "",
      contactEmail: product.metadata?.contactEmail ?? "",
      status: product.status,
      verificationExpectedTxt: "",
      verificationChecked: false,
      verificationSuccess: false,
      reviewIssues: [],
      reviewChecks: {},
    },
    mode: "onBlur",
  })

  async function next() {
    const fields = STEP_FIELDS[step] as any
    const valid = await form.trigger(fields as any, { shouldFocus: true })
    if (!valid) return
    setStep((s) => Math.min(s + 1, 5))
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1))
  }

  async function validateExternalResources(): Promise<boolean> {
    const v = form.getValues() as any
    const { issues, checks } = await validateResources(v)
    form.setValue("reviewIssues" as any, issues)
    form.setValue("reviewChecks" as any, checks)
    if (issues.length) {
      toast.error("Some links/images look invalid. Please review.")
      return false
    }
    return true
  }

  async function submitAll(values: ProductWizardInput & { status?: "draft" | "published" | "archived" }) {
    try {
      const keywords = (values.keywordsText || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await updateProductAction(product.id, {
        name: values.name.trim(),
        categoryId: values.categoryId,
        userId: product.userId,
        description: values.description,
        tagline: values.tagline,
        websiteUrl: values.websiteUrl,
        logo: values.logo,
        type: values.type as any,
        pricingModel: values.pricingModel as any,
        organizationId: values.organizationId || null,
        slug: undefined,
        status: values.status,
        publishedAt: undefined,
        startingPriceCents:
          values.startingPriceCents != null ? Number(values.startingPriceCents) : undefined,
        currencyCode: values.currencyCode?.toUpperCase(),
        ctaLabel: values.ctaLabel || null,
        ctaUrl: values.ctaUrl || null,
        bannerImage: values.bannerImage || null,
        companyName: null,
        keywords,
        platforms: values.platforms as any,
        githubUrl: values.githubUrl || null,
        twitterUrl: values.twitterUrl || null,
        demoUrl: values.demoUrl || null,
        contactEmail: values.contactEmail || null,
      })
      if ((res as any)?.error) {
        toast.error((res as any).error)
        return
      }
      toast.success("Product updated successfully")
      router.push(`/member/products/${product.id}`)
    } catch (e: any) {
      toast.error(e?.message || "Failed to update product")
    }
  }

  async function submitWithStatus(status: "draft" | "published" | "archived") {
    form.setValue("status" as any, status as any)
    const valid = await form.trigger(undefined, { shouldFocus: true })
    if (!valid) {
      setStep(1)
      return
    }
    if (status === "published") {
      const ok = await validateExternalResources()
      if (!ok) {
        setStep(5)
        return
      }
    }
    await form.handleSubmit((vals) => submitAll({ ...(vals as any), status }))()
  }

  const StepComponent = useMemo(() => {
    switch (step) {
      case 1:
        return <Step1 categories={categories} platforms={PLATFORMS as any} />
      case 2:
        return <Step2 />
      case 3:
        return <Step3 />
      case 4:
        return <Step4 organizations={organizations} />
      default:
        return <Review categories={categories} organizations={organizations} />
    }
  }, [step, categories, organizations])

  const isReview = step === 5

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">Edit Product</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stepper */}
          <WizardStepper steps={STEPS} step={step} />

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(submitAll)} className="space-y-6">
              {StepComponent}

              <Separator className="my-4" />

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={back}
                  disabled={step === 1 || form.formState.isSubmitting}
                >
                  Back
                </Button>
                {isReview ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={form.formState.isSubmitting}
                      onClick={() => submitWithStatus("draft")}
                    >
                      Save as Draft
                    </Button>
                    <Button
                      type="button"
                      disabled={form.formState.isSubmitting}
                      onClick={() => submitWithStatus("published")}
                    >
                      Publish
                    </Button>
                  </div>
                ) : (
                  <Button type="button" onClick={next}>
                    Next
                  </Button>
                )}
              </div>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export type { ProductWizardInput as EditProductValues }
