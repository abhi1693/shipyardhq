/** Reviewed overrides live in version control; maker-supplied taglines and
 * incumbent descriptions are not editorial search copy. Keys are stable slugs.
 * Add overrides only when the wording has been checked against visible content.
 */
export const PRODUCT_SEO_TITLES: Readonly<Record<string, string>> = {}
export const ALTERNATIVE_SEO_DESCRIPTIONS: Readonly<Record<string, string>> = {}

function plainText(value?: string | null) {
  return (
    value
      ?.replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || undefined
  )
}

export function getProductSeoTitle(input: {
  slug: string
  name?: string | null
  editorialTitle?: string | null
}) {
  // Preserve the product's identity without appending potentially unfinished
  // or overlong taglines. Do not cut names mid-word to meet a character quota.
  return (
    plainText(input.editorialTitle) ??
    plainText(PRODUCT_SEO_TITLES[input.slug]) ??
    plainText(input.name) ??
    "Product listing"
  )
}

export function getAlternativeSeoDescription(input: {
  slug: string
  name: string
  count: number
  editorialDescription?: string | null
}) {
  const override =
    plainText(input.editorialDescription) ??
    plainText(ALTERNATIVE_SEO_DESCRIPTIONS[input.slug])
  if (override) return override
  const name = plainText(input.name) ?? "this product"
  const count = Math.max(
    0,
    Math.floor(Number.isFinite(input.count) ? input.count : 0),
  )
  return count > 0
    ? `Browse ${count} listed ${name} alternatives. Compare product descriptions, pricing models, and supported platforms before choosing a tool.`
    : `No published alternatives to ${name} are listed yet. Browse Shipyard to find products by category, pricing model, and platform.`
}
