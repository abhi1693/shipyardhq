import type { PricingModel } from "@/lib/vendor/prisma/client"

export type PricingModelSlug =
  | "free"
  | "freemium"
  | "subscription"
  | "one-time"
  | "custom"

type PricingModelMeta = {
  slug: PricingModelSlug
  value: PricingModel
  label: string
  description: string
}

const PRICING_MODELS: PricingModelMeta[] = [
  {
    slug: "free",
    value: "free",
    label: "Free",
    description: "Totally free tools without paid plans or upgrades needed.",
  },
  {
    slug: "freemium",
    value: "freemium",
    label: "Freemium",
    description:
      "Products with a free tier plus optional paid upgrades or add-ons.",
  },
  {
    slug: "subscription",
    value: "subscription",
    label: "Subscription",
    description: "Recurring subscriptions with monthly or annual billing tiers.",
  },
  {
    slug: "one-time",
    value: "one_time",
    label: "One-time",
    description: "Single-purchase or lifetime access pricing without renewals.",
  },
  {
    slug: "custom",
    value: "custom",
    label: "Custom",
    description:
      "Priced through sales or enterprise conversations with tailored terms.",
  },
]

export const PRICING_MODEL_SLUGS = PRICING_MODELS.map(
  (entry) => entry.slug,
) as PricingModelSlug[]

const normalizeSlug = (slug?: string | null) =>
  slug?.trim().toLowerCase().replace(/_/g, "-")

export const getPricingModelMeta = (slug?: string | null) =>
  PRICING_MODELS.find((entry) => entry.slug === normalizeSlug(slug))

export const pricingModelValueFromSlug = (
  slug?: string | null,
): PricingModel | undefined => getPricingModelMeta(slug ?? undefined)?.value

export const pricingModelSlugFromValue = (
  value?: PricingModel | null,
): PricingModelSlug | undefined =>
  PRICING_MODELS.find((entry) => entry.value === value)?.slug

export const pricingModelLabelFromSlug = (slug?: string | null) =>
  getPricingModelMeta(slug ?? undefined)?.label

export const pricingModelDescriptionFromSlug = (slug?: string | null) =>
  getPricingModelMeta(slug ?? undefined)?.description
