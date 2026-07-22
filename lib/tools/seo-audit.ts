export type AuditTone = "pass" | "warning" | "error"

export type AuditFinding = {
  id: string
  label: string
  tone: AuditTone
  evidence: string
  recommendation?: string
}

export type SeoAuditResult = {
  requestedUrl: string
  finalUrl: string
  status: number
  responseTimeMs: number
  sizeBytes: number
  score: number
  title: string
  description: string
  canonical: string
  h1: string[]
  headings: number
  words: number
  links: { total: number; internal: number; external: number }
  images: { total: number; missingAlt: number; lazy: number }
  findings: AuditFinding[]
  scannedAt: string
}

type AnalyzeInput = {
  requestedUrl: string
  finalUrl: string
  status: number
  responseTimeMs: number
  sizeBytes: number
  html: string
  robotsTxt?: { found: boolean; mentionsSitemap: boolean }
  sitemap?: { found: boolean }
}

type Attributes = Record<string, string>

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
}

function stripTags(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
}

function attributes(tag: string): Attributes {
  const output: Attributes = {}
  const pattern =
    /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  for (const match of tag.matchAll(pattern)) {
    const key = match[1]?.toLowerCase()
    if (key && !key.startsWith("<"))
      output[key] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "")
  }
  return output
}

function tags(html: string, name: string) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? []
}

function firstContent(html: string, pattern: RegExp) {
  const match = html.match(pattern)
  return match?.[1] ? stripTags(match[1]) : ""
}

function meta(html: string, key: string) {
  const normalized = key.toLowerCase()
  for (const tag of tags(html, "meta")) {
    const attrs = attributes(tag)
    if (
      (
        attrs.name ??
        attrs.property ??
        attrs["http-equiv"] ??
        ""
      ).toLowerCase() === normalized
    )
      return attrs.content?.trim() ?? ""
  }
  return ""
}

function link(html: string, rel: string) {
  for (const tag of tags(html, "link")) {
    const attrs = attributes(tag)
    if ((attrs.rel ?? "").toLowerCase().split(/\s+/).includes(rel))
      return attrs.href?.trim() ?? ""
  }
  return ""
}

function addFinding(findings: AuditFinding[], finding: AuditFinding) {
  findings.push(finding)
}

export function analyzeSeoHtml(input: AnalyzeInput): SeoAuditResult {
  const { html } = input
  const title = firstContent(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i)
  const description = meta(html, "description")
  const canonical = link(html, "canonical")
  const robots = meta(html, "robots").toLowerCase()
  const viewport = meta(html, "viewport")
  const charset =
    tags(html, "meta").some((tag) => Boolean(attributes(tag).charset)) ||
    /<meta\b[^>]*http-equiv=["']?content-type/i.test(html)
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((match) => stripTags(match[1] ?? ""))
    .filter(Boolean)
  const headingLevels = [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map((match) =>
    Number(match[1]),
  )
  const skippedHeading = headingLevels.some(
    (level, index) =>
      index > 0 && level > (headingLevels[index - 1] ?? level) + 1,
  )
  const cleanedText = stripTags(
    html.replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " "),
  )
  const words =
    cleanedText.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0
  const baseUrl = new URL(input.finalUrl)
  const anchorHrefs = tags(html, "a")
    .map((tag) => attributes(tag).href)
    .filter(Boolean)
  const classifiedLinks = anchorHrefs
    .flatMap((href) => {
      try {
        const url = new URL(href, baseUrl)
        return [url.protocol.startsWith("http") ? url : null]
      } catch {
        return []
      }
    })
    .filter(Boolean) as URL[]
  const internal = classifiedLinks.filter(
    (url) => url.hostname === baseUrl.hostname,
  ).length
  const external = classifiedLinks.length - internal
  const imageTags = tags(html, "img")
  const missingAlt = imageTags.filter(
    (tag) => attributes(tag).alt === undefined,
  ).length
  const lazyImages = imageTags.filter(
    (tag) => attributes(tag).loading?.toLowerCase() === "lazy",
  ).length
  const schemaTags = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
  const validSchema = schemaTags.filter((match) => {
    try {
      JSON.parse(match[1] ?? "")
      return true
    } catch {
      return false
    }
  }).length
  const ogTitle = meta(html, "og:title")
  const ogDescription = meta(html, "og:description")
  const ogImage = meta(html, "og:image")
  const twitterCard = meta(html, "twitter:card")
  const lang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] ?? ""
  const hreflang = tags(html, "link").filter((tag) =>
    Boolean(attributes(tag).hreflang),
  ).length
  const favicon = Boolean(link(html, "icon") || link(html, "shortcut"))
  const findings: AuditFinding[] = []

  addFinding(findings, {
    id: "status",
    label: "Successful HTTP response",
    tone: input.status >= 200 && input.status < 300 ? "pass" : "error",
    evidence: `Server returned HTTP ${input.status}.`,
    recommendation: "Serve the canonical page with a successful 2xx response.",
  })
  addFinding(findings, {
    id: "https",
    label: "HTTPS",
    tone: baseUrl.protocol === "https:" ? "pass" : "error",
    evidence:
      baseUrl.protocol === "https:"
        ? "The final URL uses HTTPS."
        : "The final URL is not encrypted.",
    recommendation: "Redirect HTTP to the canonical HTTPS URL.",
  })
  addFinding(findings, {
    id: "title",
    label: "Page title",
    tone: title ? "pass" : "error",
    evidence: title || "No title element was found.",
    recommendation: "Add one descriptive title element.",
  })
  addFinding(findings, {
    id: "title-length",
    label: "Title length",
    tone: title.length >= 30 && title.length <= 60 ? "pass" : "warning",
    evidence: `${title.length} characters; 30–60 is a practical review range.`,
    recommendation:
      "Make the title concise and specific; search engines may still rewrite it.",
  })
  addFinding(findings, {
    id: "description",
    label: "Meta description",
    tone: description ? "pass" : "error",
    evidence: description || "No meta description was found.",
    recommendation:
      "Add a page-specific summary for search and sharing systems.",
  })
  addFinding(findings, {
    id: "description-length",
    label: "Description length",
    tone:
      description.length >= 120 && description.length <= 160
        ? "pass"
        : "warning",
    evidence: `${description.length} characters; 120–160 is a practical review range.`,
    recommendation:
      "Communicate the page's purpose and outcome without filler.",
  })
  addFinding(findings, {
    id: "canonical",
    label: "Canonical URL",
    tone: canonical ? "pass" : "warning",
    evidence: canonical || "No canonical link was found.",
    recommendation:
      "Declare the preferred absolute URL when duplicate variants may exist.",
  })
  addFinding(findings, {
    id: "indexing",
    label: "Indexing directive",
    tone: robots.includes("noindex") ? "error" : "pass",
    evidence: robots || "No restrictive meta robots directive found.",
    recommendation: "Remove noindex from pages intended for search.",
  })
  addFinding(findings, {
    id: "viewport",
    label: "Mobile viewport",
    tone: viewport ? "pass" : "error",
    evidence: viewport || "No viewport metadata found.",
    recommendation: "Add width=device-width and an initial scale.",
  })
  addFinding(findings, {
    id: "charset",
    label: "Character encoding",
    tone: charset ? "pass" : "warning",
    evidence: charset
      ? "A character encoding is declared."
      : "No early charset declaration was detected.",
    recommendation: "Declare UTF-8 near the beginning of the document head.",
  })
  addFinding(findings, {
    id: "h1",
    label: "Primary heading",
    tone: h1.length === 1 ? "pass" : h1.length === 0 ? "error" : "warning",
    evidence: h1.length
      ? `${h1.length} H1 heading${h1.length === 1 ? "" : "s"}: ${h1.slice(0, 2).join(" | ")}`
      : "No H1 was found.",
    recommendation: "Use one clear primary heading for the page's main topic.",
  })
  addFinding(findings, {
    id: "heading-order",
    label: "Heading hierarchy",
    tone: skippedHeading ? "warning" : "pass",
    evidence: skippedHeading
      ? "At least one heading level is skipped."
      : `${headingLevels.length} headings follow a non-skipping sequence.`,
    recommendation: "Nest section headings in a logical outline.",
  })
  addFinding(findings, {
    id: "content",
    label: "Substantive visible text",
    tone: words >= 200 ? "pass" : "warning",
    evidence: `Approximately ${words.toLocaleString()} words in the initial HTML.`,
    recommendation:
      "Answer the page's search intent completely; do not add words only to hit a target.",
  })
  addFinding(findings, {
    id: "links",
    label: "Crawlable links",
    tone: classifiedLinks.length ? "pass" : "warning",
    evidence: `${classifiedLinks.length} HTTP links: ${internal} internal and ${external} external.`,
    recommendation: "Connect the page to relevant crawlable destinations.",
  })
  addFinding(findings, {
    id: "internal-links",
    label: "Internal linking",
    tone: internal ? "pass" : "warning",
    evidence: `${internal} internal link${internal === 1 ? "" : "s"} found.`,
    recommendation: "Add useful links to related pages and next steps.",
  })
  addFinding(findings, {
    id: "image-alt",
    label: "Image alternatives",
    tone: missingAlt === 0 ? "pass" : "error",
    evidence: `${imageTags.length} images; ${missingAlt} missing an alt attribute.`,
    recommendation:
      "Add meaningful alt text or an empty alt attribute for decorative images.",
  })
  addFinding(findings, {
    id: "lazy-images",
    label: "Image lazy loading",
    tone: imageTags.length <= 1 || lazyImages > 0 ? "pass" : "warning",
    evidence: `${lazyImages} of ${imageTags.length} images declare lazy loading.`,
    recommendation:
      "Lazy-load below-the-fold images, but keep the likely hero image eager.",
  })
  addFinding(findings, {
    id: "open-graph",
    label: "Open Graph basics",
    tone: ogTitle && ogDescription && ogImage ? "pass" : "warning",
    evidence: `${[ogTitle && "title", ogDescription && "description", ogImage && "image"].filter(Boolean).join(", ") || "No core Open Graph tags"} found.`,
    recommendation:
      "Provide a specific title, description, and absolute image URL for shared links.",
  })
  addFinding(findings, {
    id: "twitter",
    label: "X card metadata",
    tone: twitterCard ? "pass" : "warning",
    evidence: twitterCard || "No twitter:card value found.",
    recommendation:
      "Declare a card type; Open Graph values can provide the remaining fallback fields.",
  })
  addFinding(findings, {
    id: "schema",
    label: "Structured data",
    tone: validSchema ? "pass" : schemaTags.length ? "error" : "warning",
    evidence: `${schemaTags.length} JSON-LD block${schemaTags.length === 1 ? "" : "s"}; ${validSchema} contain valid JSON.`,
    recommendation:
      "Add truthful JSON-LD that matches visible page content and validate it after deployment.",
  })
  addFinding(findings, {
    id: "language",
    label: "Document language",
    tone: lang ? "pass" : "warning",
    evidence: lang || "The html element has no lang attribute.",
    recommendation: "Declare the page's primary language on the html element.",
  })
  addFinding(findings, {
    id: "hreflang",
    label: "Language alternates",
    tone: hreflang ? "pass" : "warning",
    evidence: hreflang
      ? `${hreflang} hreflang annotation${hreflang === 1 ? "" : "s"}.`
      : "No hreflang annotations found; this is fine for a single-language site.",
    recommendation:
      "Only add reciprocal hreflang when localized alternatives exist.",
  })
  addFinding(findings, {
    id: "doctype",
    label: "HTML doctype",
    tone: /^\s*<!doctype html>/i.test(html) ? "pass" : "warning",
    evidence: /^\s*<!doctype html>/i.test(html)
      ? "HTML5 doctype found."
      : "HTML5 doctype not detected.",
    recommendation: "Begin the response with <!doctype html>.",
  })
  addFinding(findings, {
    id: "favicon",
    label: "Site icon",
    tone: favicon ? "pass" : "warning",
    evidence: favicon
      ? "A favicon link was found."
      : "No favicon link was detected.",
    recommendation:
      "Provide a recognizable site icon for browser and bookmark contexts.",
  })
  addFinding(findings, {
    id: "url-length",
    label: "Readable URL length",
    tone: input.finalUrl.length <= 100 ? "pass" : "warning",
    evidence: `${input.finalUrl.length} characters.`,
    recommendation:
      "Prefer concise, durable paths without unnecessary parameters.",
  })
  addFinding(findings, {
    id: "url-format",
    label: "URL formatting",
    tone: /[_\s]/.test(baseUrl.pathname) ? "warning" : "pass",
    evidence: /[_\s]/.test(baseUrl.pathname)
      ? "The path contains underscores or spaces."
      : "The path uses readable separators.",
    recommendation: "Use lowercase words separated by hyphens where practical.",
  })
  addFinding(findings, {
    id: "response-time",
    label: "Server response time",
    tone:
      input.responseTimeMs <= 1000
        ? "pass"
        : input.responseTimeMs <= 2500
          ? "warning"
          : "error",
    evidence: `${input.responseTimeMs.toLocaleString()} ms to receive the HTML response.`,
    recommendation:
      "Measure server, cache, and network time separately and reduce the slowest layer.",
  })
  addFinding(findings, {
    id: "html-size",
    label: "HTML response size",
    tone:
      input.sizeBytes <= 200_000
        ? "pass"
        : input.sizeBytes <= 500_000
          ? "warning"
          : "error",
    evidence: `${Math.ceil(input.sizeBytes / 1024).toLocaleString()} KiB.`,
    recommendation:
      "Remove unused markup and oversized inline data while preserving meaningful server-rendered content.",
  })
  if (input.robotsTxt)
    addFinding(findings, {
      id: "robots-txt",
      label: "robots.txt",
      tone: input.robotsTxt.found ? "pass" : "warning",
      evidence: input.robotsTxt.found
        ? "A robots.txt file is publicly accessible."
        : "No successful robots.txt response was found.",
      recommendation: "Publish a clear robots.txt file at the host root.",
    })
  if (input.robotsTxt)
    addFinding(findings, {
      id: "robots-sitemap",
      label: "Sitemap discovery",
      tone:
        input.robotsTxt.mentionsSitemap || input.sitemap?.found
          ? "pass"
          : "warning",
      evidence: input.robotsTxt.mentionsSitemap
        ? "robots.txt references a sitemap."
        : input.sitemap?.found
          ? "A conventional /sitemap.xml file exists."
          : "No sitemap reference or conventional sitemap was found.",
      recommendation:
        "Publish canonical URLs in an XML sitemap and reference it from robots.txt.",
    })

  const applicable = findings.length
  const lost = findings.reduce(
    (sum, finding) =>
      sum +
      (finding.tone === "error" ? 1 : finding.tone === "warning" ? 0.45 : 0),
    0,
  )
  const score = Math.max(
    0,
    Math.round(((applicable - lost) / applicable) * 100),
  )
  return {
    requestedUrl: input.requestedUrl,
    finalUrl: input.finalUrl,
    status: input.status,
    responseTimeMs: input.responseTimeMs,
    sizeBytes: input.sizeBytes,
    score,
    title,
    description,
    canonical,
    h1,
    headings: headingLevels.length,
    words,
    links: { total: classifiedLinks.length, internal, external },
    images: { total: imageTags.length, missingAlt, lazy: lazyImages },
    findings,
    scannedAt: new Date().toISOString(),
  }
}

export function auditToMarkdown(audit: SeoAuditResult) {
  const lines = [
    `# SEO audit: ${audit.finalUrl}`,
    "",
    `Score: ${audit.score}/100`,
    `Scanned: ${audit.scannedAt}`,
    "",
    "## Findings",
    "",
  ]
  for (const finding of audit.findings) {
    const mark = finding.tone === "pass" ? "x" : " "
    lines.push(
      `- [${mark}] **${finding.label}** (${finding.tone}): ${finding.evidence}`,
    )
    if (finding.tone !== "pass" && finding.recommendation)
      lines.push(`  - Recommended: ${finding.recommendation}`)
  }
  return lines.join("\n") + "\n"
}
