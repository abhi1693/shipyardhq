export type OpenGraphInput = {
  title: string
  description: string
  url: string
  imageUrl: string
  siteName: string
  twitterCard: "summary" | "summary_large_image"
}

export type FaqEntry = {
  question: string
  answer: string
}

export type SoftwareApplicationInput = {
  name: string
  description: string
  url: string
  imageUrl?: string
  applicationCategory: string
  operatingSystem: string
  price: string
  currency: string
}

export type CrawlerRule = {
  userAgent: string
  allowed: boolean
}

export type SitemapOptions = {
  changeFrequency?:
    "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: number
  lastModified?: string
}

const clean = (value: string) => value.trim()

export function extractSeoSlugSource(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""

  if (/^(?:https?:\/\/|www\.)/i.test(trimmed)) {
    try {
      const url = new URL(
        /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed,
      )
      const path = decodeURIComponent(url.pathname)
        .split("/")
        .filter(Boolean)
        .pop()
      return path || url.hostname.replace(/^www\./, "")
    } catch {
      return trimmed
    }
  }

  return trimmed
}

export function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function wrapJsonLdInScriptTag(json: string) {
  const escapedJson = json.replace(/</g, "\\u003c")
  return `<script type="application/ld+json">\n${escapedJson}\n</script>`
}

export function generateOpenGraphTags(input: OpenGraphInput) {
  const tags: Array<[string, string, "property" | "name"]> = [
    ["og:type", "website", "property"],
    ["og:title", clean(input.title), "property"],
    ["og:description", clean(input.description), "property"],
    ["og:url", clean(input.url), "property"],
    ["og:image", clean(input.imageUrl), "property"],
    ["og:site_name", clean(input.siteName), "property"],
    ["twitter:card", input.twitterCard, "name"],
    ["twitter:title", clean(input.title), "name"],
    ["twitter:description", clean(input.description), "name"],
    ["twitter:image", clean(input.imageUrl), "name"],
  ]

  return tags
    .filter(([, content]) => content.length > 0)
    .map(
      ([key, content, attribute]) =>
        `<meta ${attribute}="${key}" content="${escapeHtmlAttribute(content)}" />`,
    )
    .join("\n")
}

export function generateFaqSchema(entries: FaqEntry[]) {
  const mainEntity = entries
    .map(({ question, answer }) => ({
      question: clean(question),
      answer: clean(answer),
    }))
    .filter(({ question, answer }) => question && answer)
    .map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    }))

  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity,
    },
    null,
    2,
  )
}

export function generateSoftwareApplicationSchema(
  input: SoftwareApplicationInput,
) {
  const price = clean(input.price)
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: clean(input.name),
    description: clean(input.description),
    url: clean(input.url),
    applicationCategory: clean(input.applicationCategory),
    operatingSystem: clean(input.operatingSystem),
  }

  if (clean(input.imageUrl ?? "")) data.image = clean(input.imageUrl ?? "")
  if (price) {
    data.offers = {
      "@type": "Offer",
      price,
      priceCurrency: clean(input.currency).toUpperCase() || "USD",
    }
  }

  return JSON.stringify(data, null, 2)
}

export function generateRobotsTxt({
  allowAll,
  crawlerRules,
  sitemapUrl,
  disallowPaths = [],
}: {
  allowAll: boolean
  crawlerRules: CrawlerRule[]
  sitemapUrl?: string
  disallowPaths?: string[]
}) {
  const paths = Array.from(
    new Set(
      disallowPaths
        .map(clean)
        .filter(Boolean)
        .map((path) => (path.startsWith("/") ? path : `/${path}`)),
    ),
  )
  const allowedDirectives = paths.length
    ? paths.map((path) => `Disallow: ${path}`)
    : ["Allow: /"]
  const sections = [
    ["User-agent: *", ...(allowAll ? allowedDirectives : ["Disallow: /"])].join(
      "\n",
    ),
    ...crawlerRules.map(({ userAgent, allowed }) =>
      [
        `User-agent: ${clean(userAgent)}`,
        ...(allowed ? allowedDirectives : ["Disallow: /"]),
      ].join("\n"),
    ),
  ]

  const sitemap = clean(sitemapUrl ?? "")
  if (sitemap) sections.push(`Sitemap: ${sitemap}`)

  return `${sections.join("\n\n")}\n`
}

export function parseSitemapUrls(input: string) {
  const candidates = input
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)

  const valid: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()
  let sitemapOrigin: string | undefined

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate)
      if (!["http:", "https:"].includes(url.protocol)) {
        invalid.push(candidate)
        continue
      }
      if (sitemapOrigin === undefined) {
        sitemapOrigin = url.origin
      } else if (url.origin !== sitemapOrigin) {
        invalid.push(candidate)
        continue
      }
      const normalized = url.toString()
      if (!seen.has(normalized)) {
        valid.push(normalized)
        seen.add(normalized)
      }
    } catch {
      invalid.push(candidate)
    }
  }

  return { valid, invalid }
}

export function generateXmlSitemap(
  urls: string[],
  options: SitemapOptions = {},
) {
  const priority =
    typeof options.priority === "number"
      ? Math.min(1, Math.max(0, options.priority)).toFixed(1)
      : undefined

  const entries = urls.map((url) => {
    const properties = [`    <loc>${escapeXml(url)}</loc>`]
    if (options.lastModified) {
      properties.push(
        `    <lastmod>${escapeXml(options.lastModified)}</lastmod>`,
      )
    }
    if (options.changeFrequency) {
      properties.push(`    <changefreq>${options.changeFrequency}</changefreq>`)
    }
    if (priority) properties.push(`    <priority>${priority}</priority>`)
    return ["  <url>", ...properties, "  </url>"].join("\n")
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n")
}
