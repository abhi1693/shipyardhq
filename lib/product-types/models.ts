import type { ProductType } from "@/lib/vendor/prisma/client"

export type ProductTypeSlug =
  | "saas"
  | "browser-extension"
  | "mobile-app"
  | "desktop-app"
  | "api"
  | "open-source"
  | "other"

type ProductTypeMeta = {
  slug: ProductTypeSlug
  value: ProductType
  label: string
  description: string
}

const PRODUCT_TYPES: ProductTypeMeta[] = [
  {
    slug: "saas",
    value: "saas",
    label: "SaaS",
    description:
      "Cloud software delivered in the browser with hosted accounts and recurring access.",
  },
  {
    slug: "browser-extension",
    value: "browser_extension",
    label: "Browser extension",
    description:
      "Add-ons that live inside the browser to extend workflows or inject new context.",
  },
  {
    slug: "mobile-app",
    value: "mobile_app",
    label: "Mobile app",
    description:
      "Consumer or B2B experiences built for iOS or Android as the primary surface.",
  },
  {
    slug: "desktop-app",
    value: "desktop_app",
    label: "Desktop app",
    description:
      "Native software for macOS, Windows, or Linux with local-first capabilities.",
  },
  {
    slug: "api",
    value: "api",
    label: "API",
    description:
      "APIs, SDKs, or developer platforms that power other products and workflows.",
  },
  {
    slug: "open-source",
    value: "open_source",
    label: "Open source",
    description:
      "Community-driven projects with source available for self-hosting or contribution.",
  },
  {
    slug: "other",
    value: "other",
    label: "Other",
    description:
      "Products that don't fit the usual buckets but still ship value on Shipyard.",
  },
]

export const PRODUCT_TYPE_SLUGS = PRODUCT_TYPES.map(
  (entry) => entry.slug,
) as ProductTypeSlug[]

const normalizeSlug = (slug?: string | null) =>
  slug?.trim().toLowerCase().replace(/_/g, "-")

export const getProductTypeMeta = (slug?: string | null) =>
  PRODUCT_TYPES.find((entry) => entry.slug === normalizeSlug(slug))

export const productTypeValueFromSlug = (
  slug?: string | null,
): ProductType | undefined => getProductTypeMeta(slug ?? undefined)?.value

export const productTypeSlugFromValue = (
  value?: ProductType | null,
): ProductTypeSlug | undefined =>
  PRODUCT_TYPES.find((entry) => entry.value === value)?.slug

export const productTypeLabelFromSlug = (slug?: string | null) =>
  getProductTypeMeta(slug ?? undefined)?.label

export const productTypeDescriptionFromSlug = (slug?: string | null) =>
  getProductTypeMeta(slug ?? undefined)?.description
