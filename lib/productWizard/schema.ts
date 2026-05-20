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
      categoryId: z.string().min(1, "Category is required"),
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

      // Prevent redundant URLs
      const normalizeComparableUrl = (input: string) => {
        try {
          const u = new URL(input)
          const pathname = (u.pathname || "/").replace(/\/+$/g, "") || "/"
          return `${u.origin}${pathname}`
        } catch {
          return input.trim().replace(/\/+$/g, "")
        }
      }

      const demoUrl =
        typeof val.demoUrl === "string" ? val.demoUrl.trim() : undefined
      if (demoUrl && demoUrl.length) {
        const websiteComparable = normalizeComparableUrl(val.websiteUrl)
        const demoComparable = normalizeComparableUrl(demoUrl)
        if (websiteComparable === demoComparable) {
          ctx.addIssue({
            path: ["demoUrl"],
            code: z.ZodIssueCode.custom,
            message:
              "Demo URL must be different from Website URL. Try using a full path like 'https://example.com/demo' or 'https://example.com/app'.",
          })
        }
      }
    })
}

export const addProductSchema = makeProductSchema({ allowArchived: false })
export const editProductSchema = makeProductSchema({ allowArchived: true })

export function makeAdminAddProductSchema() {
  return addProductSchema.safeExtend({
    ownerId: z.string().min(1, "Owner is required"),
  })
}

export function makeAdminEditProductSchema() {
  return editProductSchema.safeExtend({
    ownerId: z.string().min(1, "Owner is required"),
  })
}

export type ProductWizardInputAdd = z.infer<typeof addProductSchema>
export type ProductWizardInputEdit = z.infer<typeof editProductSchema>
export type AdminProductWizardInputAdd = z.infer<
  ReturnType<typeof makeAdminAddProductSchema>
>
export type AdminProductWizardInputEdit = z.infer<
  ReturnType<typeof makeAdminEditProductSchema>
>
