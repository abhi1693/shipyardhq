import { z } from "zod"
import { IS_PROD } from "@/lib/constants"
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

      // Optional marketing/org
      organizationId: z.string().optional(),
      ctaLabel: z.string().optional(),
      ctaUrl: z.url().optional().or(z.literal("")),
      bannerImage: z.url().optional().or(z.literal("")),
      alternativeIds: z.array(z.string()).default([]),

      // Metadata
      githubUrl: z.url().optional().or(z.literal("")),
      twitterUrl: z.url().optional().or(z.literal("")),
      demoUrl: z.url().optional().or(z.literal("")),
      contactEmail: z.email().optional().or(z.literal("")),
      utmCampaign: z.string().optional().or(z.literal("")),
      status: z.enum(statusValues).optional(),

      // Payment connector (optional, saved with product)
      connectorProvider: z
        .enum(["dodo", "polar", "stripe", "lemonsqueezy", "paddle"])
        .optional(),
      connectorApiKey: z.string().optional().or(z.literal("")),
      connectorAccountId: z.string().optional().or(z.literal("")),

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

      if (val.connectorApiKey && !val.connectorProvider) {
        ctx.addIssue({
          path: ["connectorProvider"],
          code: z.ZodIssueCode.custom,
          message: "Choose a provider when adding an API key",
        })
      }

      if (val.connectorProvider === "stripe" && val.connectorApiKey) {
        const key = val.connectorApiKey.trim()
        const expectedPrefix = IS_PROD ? "rk_live_" : "rk_test_"
        if (!key.startsWith(expectedPrefix)) {
          ctx.addIssue({
            path: ["connectorApiKey"],
            code: z.ZodIssueCode.custom,
            message: IS_PROD
              ? "Use a Stripe restricted key starting with rk_live_"
              : "Use a Stripe restricted key starting with rk_test_",
          })
        }
        const acct = val.connectorAccountId?.trim()
        if (acct && !acct.startsWith("acct_")) {
          ctx.addIssue({
            path: ["connectorAccountId"],
            code: z.ZodIssueCode.custom,
            message: "Stripe connected account IDs start with acct_",
          })
        }
      }

      if (val.connectorProvider === "polar") {
        const orgId = val.connectorAccountId?.trim()
        if (val.connectorApiKey && !orgId) {
          ctx.addIssue({
            path: ["connectorAccountId"],
            code: z.ZodIssueCode.custom,
            message: "Polar organization ID is required",
          })
        }
      }

      if (val.connectorProvider === "revenuecat") {
        const projectId = val.connectorAccountId?.trim()
        if (val.connectorApiKey && !projectId) {
          ctx.addIssue({
            path: ["connectorAccountId"],
            code: z.ZodIssueCode.custom,
            message: "RevenueCat project ID is required",
          })
        }
      }

      if (val.connectorProvider === "lemonsqueezy") {
        const storeId = val.connectorAccountId?.trim()
        if (val.connectorApiKey && !storeId) {
          ctx.addIssue({
            path: ["connectorAccountId"],
            code: z.ZodIssueCode.custom,
            message: "Lemon Squeezy store ID is required",
          })
        }
      }

      if (val.connectorProvider === "paddle" && val.connectorApiKey) {
        const key = val.connectorApiKey.trim()
        const expectedPrefix = IS_PROD
          ? "pdl_live_apikey_"
          : "pdl_sdbx_apikey_"
        if (!key.startsWith(expectedPrefix)) {
          ctx.addIssue({
            path: ["connectorApiKey"],
            code: z.ZodIssueCode.custom,
            message: IS_PROD
              ? "Use a Paddle live key starting with pdl_live_apikey_"
              : "Use a Paddle sandbox key starting with pdl_sdbx_apikey_",
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
