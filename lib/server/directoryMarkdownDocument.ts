import { productPath } from "@/lib/routes"
import { siteConfig } from "@/lib/siteConfig"

export type DirectoryMarkdownProduct = {
  slug: string
  name: string
  tagline?: string | null
  category?: string | { name?: string | null; slug?: string | null } | null
  categoryName?: string | null
  analytics?: { upvotes?: number | null } | null
  upvoteCount?: number | null
  isVerified?: boolean | null
  isSponsored?: boolean | null
  sponsored?: boolean | null
}

export type DirectoryMarkdownOptions = {
  title: string
  canonicalPath: string
  description: string
  facts: string[]
  products: DirectoryMarkdownProduct[]
  total: number
}

const MAX_MARKDOWN_PRODUCTS = 12

const absoluteSiteUrl = (path: string) =>
  new URL(path, siteConfig.url).toString()

const cleanText = (value?: string | null) =>
  value?.replace(/\s+/g, " ").trim() || null

const markdownList = (items: string[]) =>
  items.map((item) => `- ${item}`).join("\n")

const productUpvotes = (product: DirectoryMarkdownProduct) => {
  if (typeof product.upvoteCount === "number") return product.upvoteCount
  if (typeof product.analytics?.upvotes === "number") {
    return product.analytics.upvotes
  }
  return null
}

const productCategory = (product: DirectoryMarkdownProduct) =>
  cleanText(product.categoryName) ??
  (typeof product.category === "string"
    ? cleanText(product.category)
    : cleanText(product.category?.name))

function productLine(product: DirectoryMarkdownProduct) {
  const upvotes = productUpvotes(product)
  const category = productCategory(product)
  const details = [
    cleanText(product.tagline),
    category ? `Category: ${category}` : null,
    upvotes !== null ? `Upvotes: ${upvotes}` : null,
    product.isVerified ? "Verified" : null,
    product.isSponsored || product.sponsored ? "Promoted" : null,
  ].filter((item): item is string => Boolean(item))

  const suffix = details.length ? ` - ${details.join("; ")}` : ""
  return `${product.name}: ${absoluteSiteUrl(productPath(product.slug))}${suffix}`
}

export function buildDirectoryMarkdownDocument({
  title,
  canonicalPath,
  description,
  facts,
  products,
  total,
}: DirectoryMarkdownOptions) {
  const topProducts = products.slice(0, MAX_MARKDOWN_PRODUCTS)
  const sections = [
    `# ${title}`,
    description,
    `Canonical: ${absoluteSiteUrl(canonicalPath)}`,
    `Markdown alternate: ${absoluteSiteUrl(`${canonicalPath}.md`)}`,
    `## Facts\n\n${markdownList([
      `Total products: ${total}`,
      ...facts.filter(Boolean),
    ])}`,
    "## What This Page Lists\n\nThis markdown alternate summarizes the public Shipyard directory page without navigation, cards, filters, or browser-only interface chrome. Use it for concise retrieval of the page topic, filters, product count, and representative product listings.",
    "## Freshness and Ranking\n\nShipyard directory pages revalidate frequently. Default ordering favors recent eligible launches, while trending and vote-based views use public Shipyard discovery signals. Promoted placements and verification status may appear as additional product context.",
  ]

  if (topProducts.length) {
    sections.push(
      `## Representative Products\n\n${markdownList(topProducts.map(productLine))}`,
    )
  }

  return `${sections.join("\n\n")}\n`
}
