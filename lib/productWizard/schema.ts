import { z } from "zod"
import { PRODUCT_TYPES, PRICING_MODELS, PLATFORMS } from "./constants"

export function makeProductSchema(opts: { allowArchived?: boolean } = {}) {
  const statusValues = opts.allowArchived
    ? (["draft", "published", "archived"] as const)
    : (["draft", "published"] as const)

  return z
    .object({
      // Basics
      name: z.string().min(1, "Name is required"),
      tagline: z.string().min(1, "Tagline is required"),
      description: z.string().min(1, "Description is required"),
      websiteUrl: z.url("Valid URL required"),
      logo: z.url("Valid logo URL required"),
      categoryId: z.string().min(1, "Category is required"),
      type: z.enum(PRODUCT_TYPES, { message: "Select a product type" }),
      platforms: z.array(z.enum(PLATFORMS)).default([]),
      keywordsText: z.string().optional().default(""),

      // Pricing
      pricingModel: z.enum(PRICING_MODELS, { message: "Select a pricing model" }),
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

      // Optional marketing/org
      organizationId: z.string().optional(),
      ctaLabel: z.string().optional(),
      ctaUrl: z.url().optional().or(z.literal("")),
      bannerImage: z.url().optional().or(z.literal("")),

      // Metadata
      githubUrl: z.url().optional().or(z.literal("")),
      twitterUrl: z.url().optional().or(z.literal("")),
      demoUrl: z.url().optional().or(z.literal("")),
      contactEmail: z.email().optional().or(z.literal("")),
      utmCampaign: z.string().optional().or(z.literal("")),
      status: z.enum(statusValues).optional(),

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
      const hasPrice =
        val.startingPriceCents != null && val.startingPriceCents !== undefined
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
}

export const makeAddProductSchema = () =>
  makeProductSchema({ allowArchived: false })
export const makeEditProductSchema = () =>
  makeProductSchema({ allowArchived: true })

export type ProductWizardInputAdd = z.infer<
  ReturnType<typeof makeAddProductSchema>
>
export type ProductWizardInputEdit = z.infer<
  ReturnType<typeof makeEditProductSchema>
>
