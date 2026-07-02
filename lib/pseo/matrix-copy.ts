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

const sentence = (value?: string | null) => {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

const capitalizeFirst = (value: string) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value

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
  const useCase = useCaseLabel.toLowerCase()

  return {
    title: `${categoryNounPhrase(categoryName, "tools")} for teams that ${useCase}`,
    description: `Shortlist ${productCountPhrase(total)} ${categoryName.toLowerCase()} listings mapped to the ${useCaseLabel} workflow. This slice keeps category fit, launch recency, and maker verification visible for faster research.`,
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
