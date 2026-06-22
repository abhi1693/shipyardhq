import type { DualmarkNextConfig } from "@dualmark/nextjs"
import { slugToTitle, type LlmsTxtSection } from "@dualmark/core"

import { PUBLIC_CONTENT_CACHE_CONTROL } from "@/lib/public-cache"
import {
  ALTERNATIVES_PATH,
  BROWSE_PATH,
  CATEGORIES_PATH,
  HOME_PATH,
  LEADERBOARD_PATH,
  PRICING_PATH,
  TAGS_PATH,
} from "@/lib/routes"
import { resolveSiteUrl, siteConfig } from "@/lib/siteConfig"

export const DUALMARK_INTERNAL_NAMESPACE = "md"

export const dualmarkExtraHeaders = {
  Link: [
    '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"; profile="https://www.rfc-editor.org/info/rfc9727"',
    '</llms.txt>; rel="service-doc"; type="text/plain"',
  ].join(", "),
}

const siteUrl = resolveSiteUrl()
const absoluteUrl = (path: string) => new URL(path, siteUrl).toString()

function titleFromPath(path: string) {
  if (path === "/") return siteConfig.name

  const lastSegment = path.split("/").filter(Boolean).at(-1) ?? siteConfig.name
  return slugToTitle(lastSegment)
}

function staticPage(path: string, description: string) {
  return {
    pattern: path,
    render: () =>
      [
        `# ${titleFromPath(path)}`,
        "",
        description,
        "",
        `Canonical: ${absoluteUrl(path)}`,
      ].join("\n"),
  }
}

function parameterizedPage(pattern: string, description: string) {
  return {
    pattern,
    getStaticPaths: () => [],
    render: ({ params }: { params: Record<string, string> }) => {
      const path = Object.entries(params).reduce(
        (current, [key, value]) => current.replace(`[${key}]`, value),
        pattern,
      )
      const title = titleFromPath(path)

      return [
        `# ${title}`,
        "",
        description,
        "",
        ...Object.entries(params).map(
          ([key, value]) => `- ${slugToTitle(key)}: ${slugToTitle(value)}`,
        ),
        "",
        `Canonical: ${absoluteUrl(path)}`,
      ].join("\n")
    },
  }
}

export const llmsTxtSections: LlmsTxtSection[] = [
  {
    title: "Indexes",
    links: [
      {
        title: "Sitemap index",
        href: absoluteUrl("/sitemap.xml"),
        description: "Entry point for all sitemaps.",
      },
      {
        title: "Main sitemap",
        href: absoluteUrl("/sitemap-main.xml"),
        description: "Core site pages.",
      },
      {
        title: "Products sitemap",
        href: absoluteUrl("/sitemap-products.xml"),
        description: "Product pages under /products/{slug}.",
      },
      {
        title: "Categories sitemap",
        href: absoluteUrl("/sitemap-archives.xml"),
        description: "Category, platform, pricing, and archive pages.",
      },
      {
        title: "Alternatives sitemap",
        href: absoluteUrl("/sitemap-alternatives.xml"),
        description: "Alternative pages under /alternatives/{slug}.",
      },
      {
        title: "Tags sitemap",
        href: absoluteUrl("/sitemap-tags.xml"),
        description: "Tag pages under /tags/{slug}.",
      },
    ],
  },
  {
    title: "Key pages",
    links: [
      {
        title: "Home",
        href: absoluteUrl(HOME_PATH),
        description: "App launch directory overview.",
      },
      {
        title: "Browse",
        href: absoluteUrl(BROWSE_PATH),
        description: "Browse products, apps, SaaS tools, APIs, and launches.",
      },
      {
        title: "Categories",
        href: absoluteUrl(CATEGORIES_PATH),
        description: "Product launch categories.",
      },
      {
        title: "Tags",
        href: absoluteUrl(TAGS_PATH),
        description: "Keyword and technology tag directory.",
      },
      {
        title: "Alternatives",
        href: absoluteUrl(ALTERNATIVES_PATH),
        description: "SaaS and app alternatives directory.",
      },
      {
        title: "Pricing",
        href: absoluteUrl(PRICING_PATH),
        description: "Plans for listing and promoting product launches.",
      },
      {
        title: "Leaderboard",
        href: absoluteUrl(LEADERBOARD_PATH),
        description: "Ranked product launches and archives.",
      },
    ],
  },
  {
    title: "Programmatic discovery",
    links: [
      {
        title: "Category pricing slices",
        href: absoluteUrl("/categories/developer-tools/pricing/free"),
        description: "Example category plus pricing intent page.",
      },
      {
        title: "Category platform slices",
        href: absoluteUrl("/categories/developer-tools/platforms/web"),
        description: "Example category plus platform intent page.",
      },
      {
        title: "Category product-type slices",
        href: absoluteUrl("/categories/developer-tools/product-types/api"),
        description: "Example category plus product type intent page.",
      },
      {
        title: "Use-case slices",
        href: absoluteUrl("/use-cases/launch-saas/categories/developer-tools"),
        description: "Example job-to-be-done directory page.",
      },
      {
        title: "Verified category slices",
        href: absoluteUrl("/verified/developer-tools"),
        description: "Trusted product directories by category.",
      },
    ],
  },
  {
    title: "Contact",
    links: [
      {
        title: "Support email",
        href: `mailto:${siteConfig.adminEmail}`,
      },
    ],
  },
  {
    title: "Optional",
    links: [
      {
        title: "Why Shipyard",
        href: absoluteUrl("/why-shipyard"),
        description: "Positioning and product overview.",
      },
      {
        title: "Privacy policy",
        href: absoluteUrl("/legal/privacy-policy"),
      },
      {
        title: "Terms",
        href: absoluteUrl("/legal/terms"),
      },
    ],
  },
]

export const dualmarkConfig = {
  siteUrl,
  internalNamespace: DUALMARK_INTERNAL_NAMESPACE,
  middleware: {
    skipPaths: ["/api", "/admin", "/member", "/.well-known"],
  },
  headers: {
    cacheControl: PUBLIC_CONTENT_CACHE_CONTROL,
    noindex: true,
  },
  staticPages: [
    staticPage(
      HOME_PATH,
      `${siteConfig.name} helps founders, indie makers, and teams launch apps, SaaS tools, APIs, AI products, and startup projects through focused discovery, rankings, promotion, and analytics.`,
    ),
    staticPage(
      BROWSE_PATH,
      "Browse products, apps, SaaS tools, APIs, and startup launches.",
    ),
    staticPage(CATEGORIES_PATH, "Explore product launch categories."),
    staticPage(
      "/analytics",
      "Public traffic and discovery analytics for Shipyard.",
    ),
    staticPage(TAGS_PATH, "Explore keyword and technology tag directories."),
    staticPage(ALTERNATIVES_PATH, "Explore SaaS and app alternatives."),
    staticPage("/platforms", "Explore products by supported platform."),
    staticPage("/product-types", "Explore products by product type."),
    staticPage("/use-cases", "Explore products by use case."),
    staticPage("/users", "Explore Shipyard makers and their launches."),
    staticPage(
      PRICING_PATH,
      "Plans for listing and promoting product launches.",
    ),
    staticPage(LEADERBOARD_PATH, "Ranked product launches and archives."),
    staticPage("/leaderboard/about", "How Shipyard leaderboard rankings work."),
    staticPage("/leaderboard/monthly", "Monthly product launch rankings."),
    staticPage("/why-shipyard", "Shipyard positioning and product overview."),
    staticPage("/legal/privacy-policy", "Shipyard privacy policy."),
    staticPage("/legal/terms", "Shipyard terms."),
    staticPage("/auth/suspended", "Account suspended notice."),
    staticPage("/login", "Shipyard account login."),
    staticPage("/register", "Create a Shipyard account."),
    staticPage("/sso-callback", "Shipyard single sign-on callback."),
  ],
  parameterizedRoutes: [
    parameterizedPage("/categories/[slug]", "Products in a launch category."),
    parameterizedPage(
      "/categories/[slug]/platforms/[platform]",
      "Products filtered by category and platform.",
    ),
    parameterizedPage(
      "/categories/[slug]/pricing/[pricingModel]",
      "Products filtered by category and pricing model.",
    ),
    parameterizedPage(
      "/categories/[slug]/product-types/[productType]",
      "Products filtered by category and product type.",
    ),
    parameterizedPage("/platforms/[platform]", "Products for a platform."),
    parameterizedPage(
      "/pricing/[pricingModel]",
      "Products for a pricing model.",
    ),
    parameterizedPage(
      "/product-types/[productType]",
      "Products for a product type.",
    ),
    parameterizedPage(
      "/tags/[slug]",
      "Products for a keyword or technology tag.",
    ),
    parameterizedPage(
      "/alternatives/[slug]",
      "Alternative products and competitors.",
    ),
    parameterizedPage(
      "/alternatives/[slug]/categories/[category]",
      "Alternative products filtered by category.",
    ),
    parameterizedPage("/use-cases/[slug]", "Products for a use case."),
    parameterizedPage(
      "/use-cases/[slug]/categories/[category]",
      "Products filtered by use case and category.",
    ),
    parameterizedPage(
      "/use-cases/[slug]/platforms/[platform]",
      "Products filtered by use case and platform.",
    ),
    parameterizedPage(
      "/use-cases/[slug]/pricing/[pricingModel]",
      "Products filtered by use case and pricing model.",
    ),
    parameterizedPage("/verified/[category]", "Verified products by category."),
    parameterizedPage(
      "/editor-picks/[category]",
      "Editor-picked products by category.",
    ),
    parameterizedPage(
      "/trends/categories/[slug]",
      "Trending products by category.",
    ),
    parameterizedPage(
      "/leaderboard/daily/[year]/[month]/[day]",
      "Daily product launch leaderboard archive.",
    ),
    parameterizedPage(
      "/leaderboard/monthly/[year]/[month]",
      "Monthly product launch leaderboard archive.",
    ),
    parameterizedPage(
      "/leaderboard/weekly/[year]/[week]",
      "Weekly product launch leaderboard archive.",
    ),
    parameterizedPage("/users/[id]", "Maker profile and product launches."),
  ],
} satisfies DualmarkNextConfig
