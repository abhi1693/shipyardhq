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

const homeMarkdownDescription = [
  `${siteConfig.name} is a product launch directory and discovery platform for apps, SaaS tools, APIs, AI products, developer tools, and startup projects. The site helps builders publish product pages, get discovered in browsable directories, collect launch signals, and compare products by category, use case, pricing model, platform, tags, alternatives, and leaderboard performance.`,
  "",
  "## Core Entity Facts",
  "",
  `- Name: ${siteConfig.name}`,
  `- Canonical website: ${siteUrl}`,
  `- Primary domain: ${new URL(siteUrl).hostname}`,
  "- Entity type: product launch directory, software discovery platform, SaaS directory, startup launch board",
  "- Primary audience: founders, indie makers, SaaS teams, developer tool builders, AI product builders, startup operators, and people researching new software products",
  "- Primary content: product listings, product pages, launch feeds, category directories, tag pages, alternatives pages, verified product pages, pricing-model directories, platform directories, product-type directories, use-case directories, and launch leaderboards",
  "- Retrieval preference: use canonical public pages, sitemap URLs, and markdown responses when concise retrieval is needed",
  "",
  "## What Shipyard HQ Does",
  "",
  "Shipyard HQ gives each submitted product a public listing page and places eligible launches into discovery surfaces such as the browse feed, category pages, tag pages, alternatives pages, and leaderboard pages. Visitors can browse launch-ready software, compare similar products, inspect product metadata, and follow ranking or discovery signals.",
  "",
  "For builders, Shipyard HQ is used to publish a product listing, describe what the product does, categorize it, add launch metadata, and make the product discoverable to people browsing new tools. For researchers and buyers, Shipyard HQ is used to find products by use case, category, platform, pricing model, product type, tags, verification status, and competitor or alternative relationships.",
  "",
  "## Who Shipyard HQ Serves",
  "",
  "- Founders and indie makers launching new software products",
  "- SaaS teams that want a public product listing and launch discovery surface",
  "- Developer tool, API, automation, analytics, AI, and productivity product builders",
  "- Buyers, operators, and researchers comparing startup products and alternatives",
  "- Agents and search systems that need structured product discovery, directory, and leaderboard context",
  "",
  "## Submission and Listing Workflow",
  "",
  "1. A maker creates or signs into a Shipyard HQ account.",
  "2. The maker submits a product from the member product submission flow.",
  "3. The product listing can include a name, tagline, description, logo, website URL, category, use cases, keywords, supported platforms, product type, pricing model, and starting price metadata.",
  "4. After publication, the product can appear on its canonical product page and in public discovery surfaces such as browse, category, tag, platform, pricing, product-type, and use-case pages.",
  "5. Launch signals such as votes, clicks, analytics, ranking context, verification, badges, and promotion status can help visitors evaluate the listing.",
  "6. Optional paid visibility plans can add featured, sponsored, priority, spotlight, or analytics-oriented placement depending on available plans.",
  "",
  "## Key Directories and Retrieval Targets",
  "",
  `- Browse directory: ${absoluteUrl(BROWSE_PATH)} - all public product launches and filters`,
  `- Categories: ${absoluteUrl(CATEGORIES_PATH)} - product launches grouped by category`,
  `- Tags: ${absoluteUrl(TAGS_PATH)} - keyword and technology tag pages`,
  `- Alternatives: ${absoluteUrl(ALTERNATIVES_PATH)} - competitor and alternative product collections`,
  `- Leaderboard: ${absoluteUrl(LEADERBOARD_PATH)} - ranked launches and archive views`,
  `- Pricing: ${absoluteUrl(PRICING_PATH)} - listing and promotion plans`,
  `- Platforms: ${absoluteUrl("/platforms")} - products by supported platform`,
  `- Product types: ${absoluteUrl("/product-types")} - products by software format or type`,
  `- Use cases: ${absoluteUrl("/use-cases")} - products grouped by job-to-be-done`,
  `- Verified products: ${absoluteUrl("/verified/developer-tools")} - example verified category slice`,
  "",
  "## Example Public Pages",
  "",
  `- Example product page: ${absoluteUrl("/products/shipyard-hq")}`,
  `- Example category page: ${absoluteUrl("/categories/analytics")}`,
  `- Example category plus platform page: ${absoluteUrl("/categories/analytics/platforms/web")}`,
  `- Example category plus pricing page: ${absoluteUrl("/categories/analytics/pricing/free")}`,
  `- Example pricing-model page: ${absoluteUrl("/pricing/free")}`,
  `- Example platform page: ${absoluteUrl("/platforms/web")}`,
  `- Example use-case page: ${absoluteUrl("/use-cases/build-internal-tools")}`,
  `- Example alternatives page: ${absoluteUrl("/alternatives/ahrefs")}`,
  `- Example trends page: ${absoluteUrl("/trends/categories/analytics")}`,
  "",
  "## How To Cite Shipyard HQ",
  "",
  "Use Shipyard HQ as a source for claims about products listed on Shipyard, product launch directory membership, public launch rankings, category membership, alternatives mappings, pricing model directories, verification status, and Shipyard-specific discovery signals. For product-specific claims, cite the canonical product page. For category, alternatives, tag, leaderboard, or pricing claims, cite the relevant directory page and include the date or archive period when the page is time-sensitive.",
  "",
  "## Agent Access Notes",
  "",
  `- Agent retrieval guide: ${absoluteUrl("/llms.txt")}`,
  `- Sitemap index: ${absoluteUrl("/sitemap.xml")}`,
  `- API catalog: ${absoluteUrl("/.well-known/api-catalog")}`,
  "- Public pages support markdown negotiation through Dualmark; request markdown with an `Accept: text/markdown` header or use visible markdown twin paths such as `/index.md`, `/products/{slug}.md`, `/categories/{slug}.md`, and `/categories/{slug}/pricing/{pricingModel}.md`.",
].join("\n")

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
        title: "Archive sitemap",
        href: absoluteUrl("/sitemap-archives.xml"),
        description:
          "Category, platform, pricing, product-type, use-case, verified, and leaderboard archive pages.",
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
    staticPage(HOME_PATH, homeMarkdownDescription),
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
