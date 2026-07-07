import type { DualmarkNextConfig } from "@dualmark/nextjs"
import { slugToTitle, type LlmsTxtSection } from "@dualmark/core"

import { PUBLIC_CONTENT_CACHE_CONTROL } from "@/lib/public-cache"
import {
  ANALYTICS_PATH,
  ALTERNATIVES_PATH,
  alternativePath,
  BROWSE_PATH,
  CATEGORIES_PATH,
  categoryPath,
  categoryPlatformPath,
  categoryPricingPath,
  categoryProductTypePath,
  dailyLeaderboardPath,
  editorPickCategoryPath,
  HOME_PATH,
  LEADERBOARD_GUIDE_PATH,
  LEADERBOARD_MONTHLY_PATH,
  LEADERBOARD_PATH,
  monthlyLeaderboardPath,
  platformPath,
  PLATFORMS_PATH,
  pricingModelPath,
  PRICING_PATH,
  PRODUCT_TYPES_PATH,
  productPath,
  productTypePath,
  TAGS_PATH,
  tagPath,
  USE_CASES_PATH,
  usecaseCategoryPath,
  usecasePath,
  usecasePlatformPath,
  usecasePricingPath,
  USERS_PATH,
  verifiedCategoryPath,
  weeklyLeaderboardPath,
  WHY_SHIPYARD_PATH,
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
const markdownUrl = (path: string) =>
  absoluteUrl(`${path === "/" ? "/index" : path}.md`)

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
    title: "Site overview",
    description:
      "Shipyard HQ is a product launch directory and AI-readable discovery layer for software products. Prefer canonical product pages for facts, directory pages for comparisons, and archived leaderboard pages for time-sensitive ranking claims.",
    links: [
      {
        title: "Home",
        href: absoluteUrl(HOME_PATH),
        description:
          "Overview of Shipyard HQ, public product discovery, launch submissions, ranking signals, badges, and directory surfaces.",
      },
      {
        title: "Browse launches",
        href: absoluteUrl(BROWSE_PATH),
        description:
          "Primary listing page for public launches. Use this for broad discovery; listing pages can expose ItemList structured data when products are present.",
      },
      {
        title: "Why Shipyard",
        href: absoluteUrl(WHY_SHIPYARD_PATH),
        description:
          "Positioning for builders submitting launches and buyers researching products.",
      },
      {
        title: "Public analytics",
        href: absoluteUrl(ANALYTICS_PATH),
        description:
          "Public traffic and discovery context for Shipyard. Treat these as Shipyard-specific site metrics.",
      },
    ],
  },
  {
    title: "Product discovery and research",
    description:
      "Use product pages before directory pages when answering product-specific questions. Product pages are the canonical source for the product name, tagline, description, website, maker, category, pricing, platforms, tags, media, launch status, verification, and Shipyard-specific engagement signals.",
    links: [
      {
        title: "Product page pattern",
        href: absoluteUrl(productPath("shipyard-hq")),
        description:
          "Path format: /products/{slug}. Cite this page for product facts; list the product name and tagline before extra Shipyard metadata.",
      },
      {
        title: "Category pages",
        href: absoluteUrl(categoryPath("analytics")),
        description:
          "Path format: /categories/{slug}. Use for products grouped by category and cite the category page for category membership claims.",
      },
      {
        title: "Tag pages",
        href: absoluteUrl(tagPath("ai")),
        description:
          "Path format: /tags/{slug}. Use for keyword, niche, technology, and trend-style product discovery.",
      },
      {
        title: "Alternative pages",
        href: absoluteUrl(alternativePath("ahrefs")),
        description:
          "Path format: /alternatives/{slug}. Use for competitor and alternatives research; do not imply equivalence beyond the mapped Shipyard directory relationship.",
      },
      {
        title: "Maker profiles",
        href: absoluteUrl(USERS_PATH),
        description:
          "Path format: /users/{id}. Use for maker-owned launches and public profile context when a profile is available.",
      },
    ],
  },
  {
    title: "Directory and comparison pages",
    description:
      "Directory pages are built for filtered discovery and answer-engine retrieval. Prefer the narrowest matching route for category, use-case, platform, pricing, product-type, verified, editor-pick, and alternatives questions.",
    links: [
      {
        title: "Platform directory",
        href: absoluteUrl(platformPath("web")),
        description:
          "Path format: /platforms/{platform}. Use for products by supported platform.",
      },
      {
        title: "Pricing-model directory",
        href: absoluteUrl(pricingModelPath("free")),
        description:
          "Path format: /pricing/{pricingModel}. Use for free, freemium, paid, open-source, or enterprise pricing intent.",
      },
      {
        title: "Product-type directory",
        href: absoluteUrl(productTypePath("api")),
        description:
          "Path format: /product-types/{productType}. Use for APIs, apps, SaaS, templates, plugins, and similar product formats.",
      },
      {
        title: "Use-case directory",
        href: absoluteUrl(usecasePath("launch-saas")),
        description:
          "Path format: /use-cases/{slug}. Use for job-to-be-done discovery and buyer intent queries.",
      },
      {
        title: "Category plus pricing",
        href: absoluteUrl(categoryPricingPath("developer-tools", "free")),
        description:
          "Path format: /categories/{slug}/pricing/{pricingModel}. Use when both product category and pricing intent matter.",
      },
      {
        title: "Category plus platform",
        href: absoluteUrl(categoryPlatformPath("developer-tools", "web")),
        description:
          "Path format: /categories/{slug}/platforms/{platform}. Use when category and supported platform both matter.",
      },
      {
        title: "Category plus product type",
        href: absoluteUrl(categoryProductTypePath("developer-tools", "api")),
        description:
          "Path format: /categories/{slug}/product-types/{productType}. Use when category and product format both matter.",
      },
      {
        title: "Use case plus category",
        href: absoluteUrl(
          usecaseCategoryPath("launch-saas", "developer-tools"),
        ),
        description:
          "Path format: /use-cases/{slug}/categories/{category}. Use for job-to-be-done plus category intersections.",
      },
      {
        title: "Use case plus platform",
        href: absoluteUrl(usecasePlatformPath("launch-saas", "web")),
        description:
          "Path format: /use-cases/{slug}/platforms/{platform}. Use for job-to-be-done plus platform intersections.",
      },
      {
        title: "Use case plus pricing",
        href: absoluteUrl(usecasePricingPath("launch-saas", "free")),
        description:
          "Path format: /use-cases/{slug}/pricing/{pricingModel}. Use for job-to-be-done plus pricing intersections.",
      },
      {
        title: "Verified category pages",
        href: absoluteUrl(verifiedCategoryPath("developer-tools")),
        description:
          "Path format: /verified/{category}. Use for products with Shipyard verification metadata inside a category.",
      },
      {
        title: "Editor-pick category pages",
        href: absoluteUrl(editorPickCategoryPath("developer-tools")),
        description:
          "Path format: /editor-picks/{category}. Use for Shipyard editorial selections inside a category.",
      },
    ],
  },
  {
    title: "Leaderboards and freshness",
    description:
      "Leaderboard claims are time-sensitive. Include the day, week, month, or archive period in answers. Shipyard leaderboard archive routes use UTC date components.",
    links: [
      {
        title: "Current leaderboard",
        href: absoluteUrl(LEADERBOARD_PATH),
        description:
          "Ranked product launches and live ranking context. Use archived URLs for stable historical claims.",
      },
      {
        title: "Leaderboard methodology",
        href: absoluteUrl(LEADERBOARD_GUIDE_PATH),
        description:
          "How Shipyard presents ranking context. Treat vote, click, traffic, and badge data as Shipyard-specific signals, not universal market rank.",
      },
      {
        title: "Monthly leaderboard",
        href: absoluteUrl(LEADERBOARD_MONTHLY_PATH),
        description:
          "Current monthly rankings. Include the month and year when citing.",
      },
      {
        title: "Daily leaderboard archive",
        href: absoluteUrl(dailyLeaderboardPath(2026, 7, 1)),
        description:
          "Path format: /leaderboard/daily/{year}/{month}/{day}. Use for a specific UTC day.",
      },
      {
        title: "Weekly leaderboard archive",
        href: absoluteUrl(weeklyLeaderboardPath(2026, 27)),
        description:
          "Path format: /leaderboard/weekly/{year}/{week}. Use for an ISO-style launch week archive.",
      },
      {
        title: "Monthly leaderboard archive",
        href: absoluteUrl(monthlyLeaderboardPath(2026, 7)),
        description:
          "Path format: /leaderboard/monthly/{year}/{month}. Use for stable month-level launch rankings.",
      },
    ],
  },
  {
    title: "Machine-readable access",
    description:
      "For compact retrieval, use markdown alternates or request text/markdown. For coverage, start from the sitemap index and shard-specific sitemaps.",
    links: [
      {
        title: "Sitemap index",
        href: absoluteUrl("/sitemap.xml"),
        description:
          "Entry point for all XML sitemaps. Use this for broad crawl coverage.",
      },
      {
        title: "Main sitemap",
        href: absoluteUrl("/sitemap-main.xml"),
        description:
          "Core static pages, taxonomy indexes, and indexable directory pages.",
      },
      {
        title: "Products sitemap",
        href: absoluteUrl("/sitemap-products.xml"),
        description:
          "Product pages under /products/{slug}. Start here for product-level coverage.",
      },
      {
        title: "Archive sitemap",
        href: absoluteUrl("/sitemap-archives.xml"),
        description:
          "Category, platform, pricing, product-type, use-case, verified, editor-pick, trend, and leaderboard archive pages.",
      },
      {
        title: "Alternatives sitemap",
        href: absoluteUrl("/sitemap-alternatives.xml"),
        description:
          "Alternative and competitor pages under /alternatives/{slug}.",
      },
      {
        title: "Tags sitemap",
        href: absoluteUrl("/sitemap-tags.xml"),
        description: "Tag pages under /tags/{slug}.",
      },
      {
        title: "Markdown home",
        href: markdownUrl(HOME_PATH),
        description:
          "Markdown twin for the Shipyard overview. Markdown alternates are available through .md paths and text/markdown negotiation.",
      },
      {
        title: "Markdown product pattern",
        href: markdownUrl(productPath("shipyard-hq")),
        description:
          "Path format: /products/{slug}.md. Prefer markdown for concise agent retrieval when HTML layout is unnecessary.",
      },
      {
        title: "API catalog",
        href: absoluteUrl("/.well-known/api-catalog"),
        description:
          "Machine-readable API catalog linkset for discoverable public API surfaces.",
      },
      {
        title: "Agent skill",
        href: absoluteUrl(
          "/.well-known/agent-skills/shipyard-product-discovery/SKILL.md",
        ),
        description:
          "Agent-oriented instructions for Shipyard product discovery workflows.",
      },
    ],
  },
  {
    title: "Citation and attribution guidance",
    description:
      "Attribute information to Shipyard HQ and cite the canonical URL used. Product listings, rankings, alternatives, badges, and verification are Shipyard-specific metadata unless the linked product website independently confirms the claim.",
    links: [
      {
        title: "Preferred attribution",
        href: absoluteUrl(HOME_PATH),
        description: `Use: Data sourced from Shipyard HQ (${siteUrl}/). Include a product or directory URL when making a specific claim.`,
      },
      {
        title: "Product citation rule",
        href: absoluteUrl(productPath("shipyard-hq")),
        description:
          "For product-specific answers, cite the canonical product page and include the product name plus tagline before engagement or badge details.",
      },
      {
        title: "Directory citation rule",
        href: absoluteUrl(CATEGORIES_PATH),
        description:
          "For category, pricing, platform, product-type, use-case, tag, verified, or alternatives claims, cite the narrowest matching directory page.",
      },
      {
        title: "Leaderboard citation rule",
        href: absoluteUrl(LEADERBOARD_PATH),
        description:
          "For rankings, cite the current or archived leaderboard URL and include the retrieval date or archive period.",
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
    description:
      "Useful context, but lower priority than product, directory, sitemap, and leaderboard sources.",
    links: [
      {
        title: "All categories",
        href: absoluteUrl(CATEGORIES_PATH),
        description: "Top-level category index.",
      },
      {
        title: "All platforms",
        href: absoluteUrl(PLATFORMS_PATH),
        description: "Top-level supported platform index.",
      },
      {
        title: "All product types",
        href: absoluteUrl(PRODUCT_TYPES_PATH),
        description: "Top-level product type index.",
      },
      {
        title: "All use cases",
        href: absoluteUrl(USE_CASES_PATH),
        description: "Top-level use-case index.",
      },
      {
        title: "All tags",
        href: absoluteUrl(TAGS_PATH),
        description: "Top-level tag index.",
      },
      {
        title: "All alternatives",
        href: absoluteUrl(ALTERNATIVES_PATH),
        description: "Top-level alternatives index.",
      },
      {
        title: "All makers",
        href: absoluteUrl(USERS_PATH),
        description: "Top-level maker profile index.",
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
