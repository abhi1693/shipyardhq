"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, FormProvider } from "react-hook-form"
import { toast } from "sonner"

import PageContainer from "@/components/layout/page-container"
import { createProductAction } from "@/actions/admin/products/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import { Separator } from "@/components/atoms/separator"

import Step1 from "../shared/step1"
import Step2 from "../shared/step2"
import Step3 from "../shared/step3"
import Step4 from "../shared/step4"
import Review from "../shared/review"
import WizardStepper from "@/components/molecules/WizardStepper"
import {
  PRODUCT_TYPES,
  PRICING_MODELS,
  PLATFORMS,
  STEPS,
  STEP_FIELDS,
} from "@/lib/productWizard/constants"
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

  // Optional marketing/company
  organizationId: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().url().optional().or(z.literal("")),
  bannerImage: z.string().url().optional().or(z.literal("")),

  // Metadata
  githubUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  demoUrl: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  status: z.enum(["draft", "published"]).optional(),
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
  const [step, setStep] = useState<number>(1)

  const form = useForm<ProductWizardInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      tagline: "",
      description: "",
      websiteUrl: "",
      logo: "",
      categoryId: "",
      type: "saas",
      pricingModel: "free",
      startingPriceCents: undefined,
      currencyCode: undefined,
      platforms: [],
      keywordsText: "",
      organizationId: "",
      ctaLabel: "",
      ctaUrl: "",
      bannerImage: "",
      githubUrl: "",
      twitterUrl: "",
      demoUrl: "",
      contactEmail: "",
      verificationExpectedTxt: "",
      verificationChecked: false,
      verificationSuccess: false,
      reviewIssues: [],
      reviewChecks: {},
    },
    mode: "onBlur",
  })

  async function next() {
    const fields = STEP_FIELDS[step]
    const valid = await form.trigger(fields as any, { shouldFocus: true })
    if (!valid) return
    setStep((s) => Math.min(s + 1, 5))
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1))
  }

  async function submitAll(values: ProductWizardInput & { status?: "draft" | "published" }) {
    try {
      const fd = new FormData()
      // Basics
      fd.append("name", values.name)
      fd.append("tagline", values.tagline)
      fd.append("description", values.description)
      fd.append("websiteUrl", values.websiteUrl)
      fd.append("logo", values.logo)
      fd.append("categoryId", values.categoryId)
      fd.append("type", values.type)
      fd.append("pricingModel", values.pricingModel)
      if (values.platforms?.length) fd.append("platforms", JSON.stringify(values.platforms))
      const keywords = (values.keywordsText || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      if (keywords.length) fd.append("keywords", JSON.stringify(keywords))

      // Pricing
      if (values.startingPriceCents != null)
        fd.append("startingPriceCents", String(values.startingPriceCents))
      if (values.currencyCode) fd.append("currencyCode", values.currencyCode.toUpperCase())

      // Optional
      if (values.organizationId) fd.append("organizationId", values.organizationId)
      if (values.ctaLabel) fd.append("ctaLabel", values.ctaLabel)
      if (values.ctaUrl) fd.append("ctaUrl", values.ctaUrl)
      if (values.bannerImage) fd.append("bannerImage", values.bannerImage)

      if (values.githubUrl) fd.append("githubUrl", values.githubUrl)
      if (values.twitterUrl) fd.append("twitterUrl", values.twitterUrl)
      if (values.demoUrl) fd.append("demoUrl", values.demoUrl)
      if (values.contactEmail) fd.append("contactEmail", values.contactEmail)

      fd.append("userId", userId)
      if (values.status) fd.append("status", values.status)

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

  const StepComponent = useMemo(() => {
    switch (step) {
      case 1:
        return (
          <Step1 categories={categories} platforms={PLATFORMS as any} />
        )
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

  async function submitWithStatus(status: "draft" | "published") {
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

  async function validateExternalResources(): Promise<boolean> {
    const v = form.getValues()
    const { issues, checks } = await validateResources(v as any)
    form.setValue("reviewIssues" as any, issues)
    form.setValue("reviewChecks" as any, checks)
    if (issues.length) {
      toast.error("Some links/images look invalid. Please review.")
      return false
    }
    return true
  }

  return (
    <PageContainer>
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Add Product
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WizardStepper steps={STEPS} step={step} />

          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(submitAll)}
              className="space-y-6"
            >
              {/* Steps */}
              {StepComponent}

              <Separator className="my-4" />

              {/* Nav */}
              <div className="flex items-center justify-between">
                <Button type="button" variant="secondary" onClick={back} disabled={step === 1 || form.formState.isSubmitting}>
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

export type { ProductWizardInput as AddProductValues }
