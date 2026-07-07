import { pluralize } from "@/lib/pluralize"
import {
  categoryNounPhrase,
  lowerCategoryNounPhrase,
} from "@/lib/seo/category-phrases"

type CategoryInput = {
  name: string
  description?: string | null
}

type CountedCopy = {
  title: string
  description: string
}

export type UseCaseCategoryEditorial = {
  eyebrow: string
  title: string
  summary: string
  criteria: Array<{
    title: string
    body: string
  }>
  shortlist: {
    title: string
    items: string[]
  } | null
  caveat: string
}

const sentence = (value?: string | null) => {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

const capitalizeFirst = (value: string) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value

const USE_CASE_GERUNDS: Record<string, string> = {
  accept: "accepting",
  automate: "automating",
  build: "building",
  create: "creating",
  deliver: "delivering",
  grow: "growing",
  launch: "launching",
  monetize: "monetizing",
  monitor: "monitoring",
  optimize: "optimizing",
  plan: "planning",
  run: "running",
  scale: "scaling",
  secure: "securing",
  ship: "shipping",
  track: "tracking",
}

export const formatUseCaseGerundPhrase = (label: string) => {
  const words = label.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return label.trim().toLowerCase()

  const [first, ...rest] = words
  const gerund = USE_CASE_GERUNDS[first]
  return gerund ? [gerund, ...rest].join(" ") : words.join(" ")
}

export const productCountPhrase = (count: number) =>
  `${count} ${pluralize(count, "product")}`

export const pricingDescriptor = (label: string) => {
  switch (label.toLowerCase()) {
    case "free":
      return "free"
    case "freemium":
      return "freemium"
    case "subscription":
      return "subscription-based"
    case "one-time":
      return "one-time purchase"
    case "custom":
      return "custom-priced"
    default:
      return `${label.toLowerCase()} priced`
  }
}

export function buildCategoryPricingMatrixCopy({
  category,
  pricingLabel,
  pricingDescription,
  total,
}: {
  category: CategoryInput
  pricingLabel: string
  pricingDescription?: string | null
  total: number
}): CountedCopy {
  const categoryTools = lowerCategoryNounPhrase(category.name, "tools")
  const pricingPhrase = pricingDescriptor(pricingLabel)
  const context = sentence(category.description)
  const pricingContext = sentence(pricingDescription)

  return {
    title: capitalizeFirst(`${pricingPhrase} ${categoryTools}`),
    description: [
      context,
      `Shortlist ${productCountPhrase(total)} in ${category.name.toLowerCase()} that use ${pricingPhrase} pricing.`,
      pricingContext,
      "Compare budget fit, launch freshness, and verified maker signals before opening each product profile.",
    ]
      .filter(Boolean)
      .join(" "),
  }
}

export function buildCategoryPlatformMatrixCopy({
  category,
  platformLabel,
  platformDescription,
  total,
}: {
  category: CategoryInput
  platformLabel: string
  platformDescription?: string | null
  total: number
}): CountedCopy {
  const categoryTools = categoryNounPhrase(category.name, "tools")
  const context = sentence(category.description)
  const platformContext = sentence(platformDescription)

  return {
    title: `${categoryTools} built for ${platformLabel}`,
    description: [
      context,
      `Review ${productCountPhrase(total)} in ${category.name.toLowerCase()} with explicit ${platformLabel} support.`,
      platformContext,
      "Use this matrix slice to compare platform fit, recent launches, and public discovery signals.",
    ]
      .filter(Boolean)
      .join(" "),
  }
}

export function buildCategoryProductTypeMatrixCopy({
  category,
  productTypeLabel,
  productTypeDescription,
  total,
}: {
  category: CategoryInput
  productTypeLabel: string
  productTypeDescription?: string | null
  total: number
}): CountedCopy {
  const categoryTools = lowerCategoryNounPhrase(category.name, "tools")
  const typeLabel = productTypeLabel.toLowerCase()

  return {
    title: `${productTypeLabel} ${categoryTools}`,
    description: [
      `${productCountPhrase(total)} ${category.name.toLowerCase()} listings are organized here by product format: ${typeLabel}.`,
      sentence(productTypeDescription),
      "Compare delivery model, category fit, verification, and launch activity from one focused Shipyard view.",
    ]
      .filter(Boolean)
      .join(" "),
  }
}

export function buildUseCaseCategoryMatrixCopy({
  useCaseLabel,
  categoryName,
  total,
}: {
  useCaseLabel: string
  categoryName: string
  total: number
}): CountedCopy {
  const useCase = formatUseCaseGerundPhrase(useCaseLabel)
  const categoryTools = lowerCategoryNounPhrase(categoryName, "tools")
  const count = productCountPhrase(total)

  return {
    title: `Best ${categoryTools} for ${useCase}`,
    description: `Explore ${count} ${categoryTools} for teams ${useCase}. Compare new launches, pricing, platforms, maker profiles, screenshots, and verified products before you pick the right tool.`,
  }
}

export function buildUseCaseCategoryEditorial({
  useCaseLabel,
  categoryName,
  categoryDescription,
  total,
  productNames,
}: {
  useCaseLabel: string
  categoryName: string
  categoryDescription?: string | null
  total: number
  productNames?: string[]
}): UseCaseCategoryEditorial {
  const useCase = useCaseLabel.toLowerCase()
  const categoryLower = categoryName.toLowerCase()
  const categoryTools = lowerCategoryNounPhrase(categoryName, "tools")
  const cleanProductNames = Array.from(
    new Set((productNames ?? []).map((name) => name.trim()).filter(Boolean)),
  ).slice(0, 4)
  const context = sentence(categoryDescription)

  return {
    eyebrow: "Editorial shortlist",
    title: `How to choose ${categoryTools} for teams that ${useCase}`,
    summary: [
      context,
      `The best ${categoryTools} for teams that ${useCase} should match the workflow first, then prove category fit with clear product metadata, recent launch activity, visible maker signals, and enough public context to compare alternatives without opening every listing.`,
    ]
      .filter(Boolean)
      .join(" "),
    criteria: [
      {
        title: "Workflow fit",
        body: `Start with products that explicitly support the ${useCaseLabel} job-to-be-done instead of broad ${categoryLower} positioning. The strongest matches explain the use case in the tagline, description, tags, or category relationships.`,
      },
      {
        title: "Category proof",
        body: `Use this page when ${categoryLower} is a hard requirement. Product pages should make the category, product type, pricing model, platform support, and alternatives clear enough for side-by-side evaluation.`,
      },
      {
        title: "Trust and freshness",
        body: "Prioritize listings with recent updates, verified maker signals, badges, screenshots, and meaningful Shipyard discovery signals. Treat rankings, badges, and upvotes as Shipyard-specific metadata, not universal market rank.",
      },
      {
        title: "Shortlist depth",
        body: `${productCountPhrase(total)} currently match this route. Use newest sorting for fresh launches, trending or vote sorting for traction, and verified-only filtering when buyer trust matters more than breadth.`,
      },
    ],
    shortlist: cleanProductNames.length
      ? {
          title: "Products to start with",
          items: cleanProductNames.map(
            (name) =>
              `${name} appears in this filtered Shipyard slice and should be reviewed for workflow fit, pricing, platform support, and current launch signals.`,
          ),
        }
      : null,
    caveat:
      "This guide is directory context, not a paid ranking or endorsement. Open each canonical product page to verify current features, pricing, website details, maker information, and screenshots before choosing a vendor.",
  }
}

export function buildUseCasePlatformMatrixCopy({
  useCaseLabel,
  platformLabel,
  total,
}: {
  useCaseLabel: string
  platformLabel: string
  total: number
}): CountedCopy {
  const useCase = useCaseLabel.toLowerCase()

  return {
    title: `${platformLabel} products for teams that ${useCase}`,
    description: `Evaluate ${productCountPhrase(total)} ${platformLabel} listings tied to the ${useCaseLabel} use case. Compare platform compatibility, freshness, verification, and Shipyard discovery signals in one view.`,
  }
}

export function buildUseCasePricingMatrixCopy({
  useCaseLabel,
  pricingLabel,
  total,
}: {
  useCaseLabel: string
  pricingLabel: string
  total: number
}): CountedCopy {
  const useCase = useCaseLabel.toLowerCase()
  const pricingPhrase = pricingDescriptor(pricingLabel)

  return {
    title: `${capitalizeFirst(pricingPhrase)} products for teams that ${useCase}`,
    description: `Compare ${productCountPhrase(total)} ${pricingPhrase} listings mapped to the ${useCaseLabel} workflow. Use this pricing slice to check budget model, launch recency, and maker trust signals before shortlisting.`,
  }
}

export function buildAlternativeCategoryMatrixCopy({
  alternativeName,
  categoryName,
  total,
  currentYear,
}: {
  alternativeName: string
  categoryName: string
  total: number
  currentYear?: number
}): CountedCopy {
  const yearSuffix = currentYear ? ` for ${currentYear}` : ""

  return {
    title: `${alternativeName} alternatives in ${categoryName}`,
    description: `Evaluate ${productCountPhrase(total)} ${categoryName.toLowerCase()} listings positioned around ${alternativeName}${yearSuffix}. This category slice separates close substitutes from broader competitors and keeps launch traction visible.`,
  }
}

export function buildVerifiedCategoryMatrixCopy({
  categoryName,
  total,
}: {
  categoryName: string
  total: number
}): CountedCopy {
  return {
    title: `Verified ${categoryNounPhrase(categoryName, "tools")}`,
    description: `${productCountPhrase(total)} verified ${categoryName.toLowerCase()} listings have stronger maker or profile signals on Shipyard. Use this directory to compare trusted launches, backlinks, and discovery-ready product pages.`,
  }
}

export function buildEditorPickCategoryMatrixCopy({
  categoryName,
  total,
}: {
  categoryName: string
  total: number
}): CountedCopy {
  return {
    title: `Curated ${categoryNounPhrase(categoryName, "tools")}`,
    description: `${productCountPhrase(total)} editor-picked ${categoryName.toLowerCase()} listings are collected for faster evaluation. Review curation signals, category fit, launch freshness, and maker context before opening each profile.`,
  }
}
