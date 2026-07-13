export const PUBLIC_PRODUCT_CATEGORY_LIMIT = 3

export type ProductCategorySummary = {
  name: string
  slug: string | null
}

type ProductCategoryLike = {
  name?: string | null
  slug?: string | null
}

type ProductCategoryCandidate =
  | ProductCategoryLike
  | { category: ProductCategoryLike | null }
  | null
  | undefined

function unwrapCategory(
  candidate: ProductCategoryCandidate,
): ProductCategoryLike | null {
  if (!candidate) return null
  if ("category" in candidate) return candidate.category ?? null
  return candidate
}

export function resolveProductCategories(
  primary?: ProductCategoryLike | null,
  assigned?: readonly ProductCategoryCandidate[] | null,
): ProductCategorySummary[] {
  const categories: ProductCategorySummary[] = []
  const seenNames = new Set<string>()
  const seenSlugs = new Set<string>()

  for (const candidate of [primary, ...(assigned ?? [])]) {
    const category = unwrapCategory(candidate)
    const name = category?.name?.trim()
    if (!name) continue

    const slug = category?.slug?.trim() || null
    const nameKey = name.toLowerCase()
    const slugKey = slug?.toLowerCase() ?? null

    if (seenNames.has(nameKey) || (slugKey && seenSlugs.has(slugKey))) {
      continue
    }

    categories.push({ name, slug })
    seenNames.add(nameKey)
    if (slugKey) seenSlugs.add(slugKey)

    if (categories.length === PUBLIC_PRODUCT_CATEGORY_LIMIT) break
  }

  return categories
}
