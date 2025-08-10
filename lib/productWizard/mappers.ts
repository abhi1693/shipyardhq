import { parseKeywords, sanitizeTextFields, uppercaseCurrency, normalizeUrl, coercePricing } from "./transform";

type BaseValues = Record<string, any>;

export function getInitialValuesForAdd(): BaseValues {
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
    organizationId: "",
    ctaLabel: "",
    ctaUrl: "",
    bannerImage: "",
    githubUrl: "",
    twitterUrl: "",
    demoUrl: "",
    contactEmail: "",
    verificationExpectedTxt: "",
    verificationChecked: false,
    verificationSuccess: false,
    reviewIssues: [],
    reviewChecks: {},
  };
}

export function getInitialValuesFromProduct(product: any): BaseValues {
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
    organizationId: product.organizationId ?? "",
    ctaLabel: product.ctaLabel ?? "",
    ctaUrl: product.ctaUrl ?? "",
    bannerImage: product.bannerImage ?? "",
    githubUrl: product.metadata?.githubUrl ?? "",
    twitterUrl: product.metadata?.twitterUrl ?? "",
    demoUrl: product.metadata?.demoUrl ?? "",
    contactEmail: product.metadata?.contactEmail ?? "",
    status: product.status,
    verificationExpectedTxt: "",
    verificationChecked: false,
    verificationSuccess: false,
    reviewIssues: [],
    reviewChecks: {},
  };
}

export function toCreateFormData(values: BaseValues, userId: string): FormData {
  const v0 = sanitizeTextFields(values);
  const v = coercePricing(v0);
  const fd = new FormData();
  // Basics
  fd.append("name", v.name);
  fd.append("tagline", v.tagline);
  fd.append("description", v.description);
  fd.append("websiteUrl", normalizeUrl(v.websiteUrl) || v.websiteUrl);
  fd.append("logo", normalizeUrl(v.logo) || v.logo);
  fd.append("categoryId", v.categoryId);
  fd.append("type", v.type);
  fd.append("pricingModel", v.pricingModel);
  if (v.platforms?.length) fd.append("platforms", JSON.stringify(v.platforms));

  const keywords = parseKeywords(v.keywordsText);
  if (keywords.length) fd.append("keywords", JSON.stringify(keywords));

  // Pricing
  if (v.startingPriceCents != null) fd.append("startingPriceCents", String(v.startingPriceCents));
  if (v.currencyCode) fd.append("currencyCode", uppercaseCurrency(v.currencyCode)!);

  // Optional
  if (v.organizationId) fd.append("organizationId", v.organizationId);
  if (v.ctaLabel) fd.append("ctaLabel", v.ctaLabel);
  if (v.ctaUrl) fd.append("ctaUrl", normalizeUrl(v.ctaUrl)!);
  if (v.bannerImage) fd.append("bannerImage", normalizeUrl(v.bannerImage)!);

  if (v.githubUrl) fd.append("githubUrl", normalizeUrl(v.githubUrl)!);
  if (v.twitterUrl) fd.append("twitterUrl", normalizeUrl(v.twitterUrl)!);
  if (v.demoUrl) fd.append("demoUrl", normalizeUrl(v.demoUrl)!);
  if (v.contactEmail) fd.append("contactEmail", v.contactEmail);

  fd.append("userId", userId);
  if (v.status) fd.append("status", v.status);
  return fd;
}

export function toUpdatePayload(values: BaseValues, product: any) {
  const v0 = sanitizeTextFields(values);
  const v = coercePricing(v0) as any;
  const keywords = parseKeywords(v.keywordsText);
  return {
    name: v.name,
    categoryId: v.categoryId,
    userId: product.userId,
    description: v.description,
    tagline: v.tagline,
    websiteUrl: normalizeUrl(v.websiteUrl) || v.websiteUrl,
    logo: normalizeUrl(v.logo) || v.logo,
    type: v.type as any,
    pricingModel: v.pricingModel as any,
    organizationId: v.organizationId || null,
    slug: undefined,
    status: v.status,
    publishedAt: undefined,
    startingPriceCents: v.startingPriceCents != null ? Number(v.startingPriceCents) : undefined,
    currencyCode: uppercaseCurrency(v.currencyCode),
    ctaLabel: v.ctaLabel || null,
    ctaUrl: v.ctaUrl ? normalizeUrl(v.ctaUrl) : null,
    bannerImage: v.bannerImage ? normalizeUrl(v.bannerImage) : null,
    companyName: null,
    keywords,
    platforms: v.platforms as any,
    githubUrl: v.githubUrl ? normalizeUrl(v.githubUrl) : null,
    twitterUrl: v.twitterUrl ? normalizeUrl(v.twitterUrl) : null,
    demoUrl: v.demoUrl ? normalizeUrl(v.demoUrl) : null,
    contactEmail: v.contactEmail || null,
  };
}
