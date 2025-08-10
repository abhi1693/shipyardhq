export const PRODUCT_TYPES = [
  "saas",
  "browser_extension",
  "mobile_app",
  "desktop_app",
  "api",
  "open_source",
  "other",
] as const

export const PRICING_MODELS = [
  "free",
  "freemium",
  "subscription",
  "one_time",
  "custom",
] as const

export const PLATFORMS = [
  "web",
  "ios",
  "android",
  "mac",
  "windows",
  "linux",
  "chrome_extension",
  "firefox_extension",
] as const

export const STEPS: { id: number; label: string }[] = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Pricing" },
  { id: 3, label: "Verification" },
  { id: 4, label: "Details" },
  { id: 5, label: "Review" },
]

// Keep this untyped to avoid coupling to zod types; pages cast when needed.
export const STEP_FIELDS: Record<number, readonly string[]> = {
  1: [
    "name",
    "tagline",
    "description",
    "websiteUrl",
    "logo",
    "categoryId",
    "type",
    "platforms",
    "keywordsText",
  ],
  2: ["pricingModel", "startingPriceCents", "currencyCode"],
  3: ["websiteUrl"],
  4: [
    "organizationId",
    "ctaLabel",
    "ctaUrl",
    "bannerImage",
    "githubUrl",
    "twitterUrl",
    "demoUrl",
    "contactEmail",
  ],
}
