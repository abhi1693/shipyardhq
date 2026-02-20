import {
  parseKeywords,
  sanitizeTextFields,
  uppercaseCurrency,
  normalizeUrl,
  coercePricing,
} from "./transform"
import type { ProductWizardInputAdd, ProductWizardInputEdit } from "./schema"
import type { ProductForEditWizard } from "@/types/product-wizard"

type ConnectorDefaults = {
  provider?: ProductWizardInputEdit["connectorProvider"] | null
  accountId?: string | null
  brandId?: string | null
}

export function getInitialValuesForAdd(): ProductWizardInputAdd {
  return {
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
    bannerImage: "",
    galleryMedia: [],
    githubUrl: "",
    twitterUrl: "",
    demoUrl: "",
    contactEmail: "",
    utmCampaign: "",
    alternativeIds: [],
    connectorProvider: undefined,
    connectorApiKey: "",
    connectorAccountId: "",
    connectorBrandId: "",
    verificationExpectedTxt: "",
    verificationChecked: false,
    verificationSuccess: false,
    reviewIssues: [],
    reviewChecks: {},
  }
}

export function getInitialValuesFromProduct(
  product: ProductForEditWizard,
  connector?: ConnectorDefaults,
): ProductWizardInputEdit {
  return {
    name: product.name,
    tagline: product.tagline ?? "",
    description: product.description ?? "",
    websiteUrl: product.websiteUrl ?? "",
    logo: product.logo ?? "",
    categoryId: product.categoryId,
    type: product.type,
    pricingModel: product.pricingModel,
    startingPriceCents: product.startingPriceCents ?? undefined,
    currencyCode: product.currencyCode ?? undefined,
    platforms: product.platforms ?? [],
    keywordsText: (product.keywords ?? []).join(", "),
    bannerImage: product.bannerImage ?? "",
    galleryMedia: [],
    githubUrl: product.metadata?.githubUrl ?? "",
    twitterUrl: product.metadata?.twitterUrl ?? "",
    demoUrl: product.metadata?.demoUrl ?? "",
    contactEmail: product.metadata?.contactEmail ?? "",
    utmCampaign: product.metadata?.utmCampaign ?? "",
    alternativeIds: Array.isArray(product.alternatives)
      ? product.alternatives.map((alt) => alt.id)
      : [],
    connectorProvider: connector?.provider ?? undefined,
    connectorApiKey: "",
    connectorAccountId: connector?.accountId ?? "",
    connectorBrandId: connector?.brandId ?? "",
    status: product.status,
    verificationExpectedTxt: "",
    verificationChecked: false,
    verificationSuccess: false,
    reviewIssues: [],
    reviewChecks: {},
  }
}

export function toCreateFormData(
  values: ProductWizardInputAdd,
  userId: string,
  productId?: string,
): FormData {
  const v0 = sanitizeTextFields(values)
  const v = coercePricing(v0)
  const fd = new FormData()
  // Basics
  if (productId) fd.append("id", productId)
  fd.append("name", v.name)
  fd.append("tagline", v.tagline)
  fd.append("description", v.description)
  fd.append("websiteUrl", normalizeUrl(v.websiteUrl) || v.websiteUrl)
  fd.append("logo", normalizeUrl(v.logo) || v.logo)
  fd.append("categoryId", v.categoryId)
  fd.append("type", v.type)
  fd.append("pricingModel", v.pricingModel)
  if (v.platforms?.length) fd.append("platforms", JSON.stringify(v.platforms))

  const keywords = parseKeywords(v.keywordsText)
  if (keywords.length) fd.append("keywords", JSON.stringify(keywords))

  // Pricing
  if (v.startingPriceCents != null)
    fd.append("startingPriceCents", String(v.startingPriceCents))
  if (v.currencyCode)
    fd.append("currencyCode", uppercaseCurrency(v.currencyCode)!)

  // Optional
  if (v.bannerImage) fd.append("bannerImage", normalizeUrl(v.bannerImage)!)
  if (Array.isArray(v.galleryMedia) && v.galleryMedia.length) {
    fd.append("galleryMedia", JSON.stringify(v.galleryMedia))
  }

  if (v.githubUrl) fd.append("githubUrl", normalizeUrl(v.githubUrl)!)
  if (v.twitterUrl) fd.append("twitterUrl", normalizeUrl(v.twitterUrl)!)
  if (v.demoUrl) fd.append("demoUrl", normalizeUrl(v.demoUrl)!)
  if (v.contactEmail) fd.append("contactEmail", v.contactEmail)
  if (v.utmCampaign) fd.append("utmCampaign", v.utmCampaign)
  if (Array.isArray(v.alternativeIds) && v.alternativeIds.length) {
    fd.append("alternativeIds", JSON.stringify(v.alternativeIds))
  }
  if (v.connectorProvider) fd.append("connectorProvider", v.connectorProvider)
  if (v.connectorApiKey) fd.append("connectorApiKey", v.connectorApiKey)
  if (v.connectorAccountId)
    fd.append("connectorAccountId", v.connectorAccountId)
  if (v.connectorBrandId) fd.append("connectorBrandId", v.connectorBrandId)

  fd.append("userId", userId)
  if (v.status) fd.append("status", v.status)
  return fd
}

export function toUpdatePayload(
  values: ProductWizardInputEdit,
  product: ProductForEditWizard,
) {
  const v0 = sanitizeTextFields(values)
  const v = coercePricing(v0)
  const keywords = parseKeywords(v.keywordsText)
  return {
    name: v.name,
    categoryId: v.categoryId,
    userId: product.userId,
    description: v.description,
    tagline: v.tagline,
    websiteUrl: normalizeUrl(v.websiteUrl) || v.websiteUrl,
    logo: normalizeUrl(v.logo) || v.logo,
    type: v.type,
    pricingModel: v.pricingModel,
    slug: undefined,
    status: v.status,
    publishedAt: undefined,
    startingPriceCents:
      v.startingPriceCents != null ? Number(v.startingPriceCents) : undefined,
    currencyCode: uppercaseCurrency(v.currencyCode),
    bannerImage: v.bannerImage ? normalizeUrl(v.bannerImage) : null,
    keywords,
    platforms: v.platforms,
    githubUrl: v.githubUrl ? normalizeUrl(v.githubUrl) : null,
    twitterUrl: v.twitterUrl ? normalizeUrl(v.twitterUrl) : null,
    demoUrl: v.demoUrl ? normalizeUrl(v.demoUrl) : null,
    contactEmail: v.contactEmail || null,
    utmCampaign: v.utmCampaign || null,
    alternativeIds: Array.isArray(v.alternativeIds) ? v.alternativeIds : [],
    connectorProvider: v.connectorProvider || null,
    connectorApiKey: v.connectorApiKey || "",
    connectorAccountId: v.connectorAccountId || "",
    connectorBrandId:
      v.connectorBrandId !== undefined && v.connectorBrandId !== null
        ? v.connectorBrandId
        : undefined,
  }
}
