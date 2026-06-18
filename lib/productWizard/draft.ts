import { z } from "zod"

import { PLATFORMS, PRICING_MODELS, PRODUCT_TYPES } from "./constants"
import { getInitialValuesForAdd } from "./mappers"
import type { ProductWizardInputAdd } from "./schema"

export const PRODUCT_DRAFT_STEPS = [
  "configuration",
  "assets",
  "commercial",
  "validation",
  "positioning",
] as const

export type ProductDraftStep = (typeof PRODUCT_DRAFT_STEPS)[number]
export type ProductDraftMode = "member"

export const PRODUCT_DRAFT_STEP_META: Record<
  ProductDraftStep,
  {
    label: string
    title: string
    description: string
  }
> = {
  configuration: {
    label: "Configuration",
    title: "Core product parameters",
    description: "Website, name, description, category, and supported clients.",
  },
  assets: {
    label: "Assets",
    title: "Brand identity and gallery",
    description: "Upload the logo, social banner, and launch screenshots.",
  },
  commercial: {
    label: "Commercial",
    title: "Pricing architecture",
    description: "Define the monetization model and starting price.",
  },
  validation: {
    label: "Validation",
    title: "Domain validation",
    description: "Verify ownership to show a trusted product badge.",
  },
  positioning: {
    label: "Positioning",
    title: "Market positioning",
    description: "Add links, campaign metadata, and competitor alternatives.",
  },
}

const optionalUrl = z.url("Valid URL required").optional().or(z.literal(""))

export const productDraftStepSchemas: Record<ProductDraftStep, z.ZodTypeAny> = {
  configuration: z.object({
    websiteUrl: z
      .preprocess(
        (v) => (typeof v === "string" ? v.replace(/^\/+/, "").trim() : v),
        z.string().min(1, "Website URL is required"),
      )
      .pipe(z.url("Valid URL required")),
    name: z.string().trim().min(1, "Name is required"),
    tagline: z.string().trim().min(1, "Tagline is required"),
    description: z
      .string()
      .trim()
      .min(1, "Description is required")
      .refine(
        (value) => !/(^|\n)\s*#(?!#)/.test(value),
        "Use Heading 2 or smaller (##, ###, etc.) instead of level 1 headings.",
      ),
    categoryId: z.string().optional().default(""),
    categoryIds: z
      .array(z.string())
      .min(1, "Select at least 1 category.")
      .max(3, "You can select up to 3 categories."),
    type: z.enum(PRODUCT_TYPES, { message: "Select a product type" }),
    platforms: z.array(z.enum(PLATFORMS)).default([]),
    keywordsText: z.string().optional().default(""),
  }),
  assets: z.object({
    logo: z.url("Valid logo URL required"),
    bannerImage: optionalUrl,
    videoUrl: optionalUrl,
    galleryMedia: z
      .array(z.url())
      .max(6, "You can add up to 6 screenshots.")
      .optional()
      .default([]),
  }),
  commercial: z
    .object({
      pricingModel: z.enum(PRICING_MODELS, {
        message: "Select a pricing model",
      }),
      startingPriceCents: z
        .number({ message: "Enter a valid number" })
        .int("Must be an integer")
        .nonnegative("Cannot be negative")
        .nullable()
        .optional(),
      currencyCode: z
        .string()
        .regex(/^[A-Z]{3}$/i, "3-letter code, e.g. USD")
        .nullable()
        .optional(),
    })
    .superRefine((val, ctx) => {
      const requiresPrice =
        val.pricingModel === "subscription" || val.pricingModel === "one_time"
      if (!requiresPrice) return

      if (val.startingPriceCents == null) {
        ctx.addIssue({
          path: ["startingPriceCents"],
          code: z.ZodIssueCode.custom,
          message: "Price required for this model",
        })
      }
      if (!val.currencyCode) {
        ctx.addIssue({
          path: ["currencyCode"],
          code: z.ZodIssueCode.custom,
          message: "Currency required",
        })
      }
    }),
  validation: z.object({
    verificationExpectedTxt: z.string().optional(),
    verificationChecked: z.boolean().optional(),
    verificationSuccess: z.boolean().optional(),
  }),
  positioning: z.object({
    websiteUrl: z.string().optional().default(""),
    githubUrl: optionalUrl,
    twitterUrl: optionalUrl,
    contactEmail: z.email().optional().or(z.literal("")),
    utmCampaign: z.string().optional().or(z.literal("")),
    alternativeIds: z
      .array(z.string())
      .max(3, "You can add up to 3 alternatives.")
      .default([]),
  }),
}

export function isProductDraftStep(value: string): value is ProductDraftStep {
  return (PRODUCT_DRAFT_STEPS as readonly string[]).includes(value)
}

export function getNextProductDraftStep(step: ProductDraftStep) {
  const index = PRODUCT_DRAFT_STEPS.indexOf(step)
  return PRODUCT_DRAFT_STEPS[index + 1] ?? null
}

export function getPreviousProductDraftStep(step: ProductDraftStep) {
  const index = PRODUCT_DRAFT_STEPS.indexOf(step)
  return index > 0 ? PRODUCT_DRAFT_STEPS[index - 1] : null
}

export function mergeDraftPayload(payload: unknown): ProductWizardInputAdd {
  const base = getInitialValuesForAdd()
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return base
  }

  const merged = {
    ...base,
    ...(payload as Partial<ProductWizardInputAdd>),
  }

  if (
    (!Array.isArray((merged as any).categoryIds) ||
      !(merged as any).categoryIds.length) &&
    typeof (merged as any).categoryId === "string" &&
    (merged as any).categoryId.length
  ) {
    ;(merged as any).categoryIds = [(merged as any).categoryId]
  }

  return merged
}

export function productDraftStepPath(
  _mode: ProductDraftMode,
  draftId: string,
  step: ProductDraftStep,
) {
  return `/member/products/add/${draftId}/${step}`
}
