import { z } from "zod"
import { PRODUCT_TYPES, PRICING_MODELS, PLATFORMS } from "./constants"

function makeProductSchema(opts: { allowArchived?: boolean } = {}) {
  const statusValues = opts.allowArchived
    ? (["draft", "published", "archived"] as const)
    : (["draft", "published"] as const)

  return z
    .object({
      // Basics
      name: z.string().min(1, "Name is required"),
      tagline: z.string().min(1, "Tagline is required"),
      description: z
        .string()
        .min(1, "Description is required")
        .refine(
          (value) => !/(^|\n)\s*#(?!#)/.test(value),
          "Use Heading 2 or smaller (##, ###, etc.) instead of level 1 headings.",
        ),
      websiteUrl: z
        .preprocess(
          (v) => (typeof v === "string" ? v.replace(/^\/+/, "").trim() : v),
          z.string(),
        )
        .transform((s) => s as string)
        .pipe(z.url("Valid URL required")),
      logo: z.url("Valid logo URL required"),
      categoryId: z.string().optional().default(""),
      categoryIds: z
        .array(z.string())
        .min(1, "Select at least 1 category.")
        .max(3, "You can select up to 3 categories."),
      type: z.enum(PRODUCT_TYPES, { message: "Select a product type" }),
      platforms: z.array(z.enum(PLATFORMS)).default([]),
      keywordsText: z.string().optional().default(""),

      // Pricing
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

      // Optional marketing
      bannerImage: z.url().optional().or(z.literal("")),
      galleryMedia: z
        .array(z.url())
        .max(6, "You can add up to 6 screenshots.")
        .optional()
        .default([]),
      alternativeIds: z
        .array(z.string())
        .max(3, "You can add up to 3 alternatives.")
        .default([]),

      // Metadata
      githubUrl: z.url().optional().or(z.literal("")),
      twitterUrl: z.url().optional().or(z.literal("")),
      videoUrl: z.url().optional().or(z.literal("")),
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
          githubOk: z.boolean().optional(),
          twitterOk: z.boolean().optional(),
          videoOk: z.boolean().optional(),
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
      const uniqueCategoryIds = Array.from(new Set(val.categoryIds ?? []))
      if (!uniqueCategoryIds.length) {
        ctx.addIssue({
          path: ["categoryIds"],
          code: z.ZodIssueCode.custom,
          message: "Select at least 1 category.",
        })
      }
      if (uniqueCategoryIds.length > 3) {
        ctx.addIssue({
          path: ["categoryIds"],
          code: z.ZodIssueCode.custom,
          message: "You can select up to 3 categories.",
        })
      }
    })
}

export const addProductSchema = makeProductSchema({ allowArchived: false })
export const editProductSchema = makeProductSchema({ allowArchived: true })

export type ProductWizardInputAdd = z.infer<typeof addProductSchema>
export type ProductWizardInputEdit = z.infer<typeof editProductSchema>
