import { resolveSiteUrl, toAbsoluteUrlFromSite } from "@/lib/seo/base"

export type ReviewAuthorInput = {
  name: string
  type?: "Person" | "Organization"
  url?: string
}

export type ReviewRatingInput = {
  value: number | string
  best?: number
  worst?: number
}

export type ReviewItemInput = {
  type?: string
  name?: string
  id?: string
  url?: string
  path?: string
}

export type ReviewInput = {
  id?: string
  url?: string
  path?: string
  title?: string
  body: string
  datePublished?: string
  author: ReviewAuthorInput
  rating?: ReviewRatingInput
  itemReviewed?: ReviewItemInput
}

export type ReviewStructuredData = {
  "@context": "https://schema.org"
  "@type": "Review"
  "@id"?: string
  url?: string
  name?: string
  reviewBody: string
  datePublished?: string
  author: {
    "@type": "Person" | "Organization"
    name: string
    url?: string
  }
  reviewRating?: {
    "@type": "Rating"
    ratingValue: string
    bestRating?: number
    worstRating?: number
  }
  itemReviewed?: {
    "@type": string
    name?: string
    "@id"?: string
    url?: string
  }
}

const normalizePath = (value?: string) => {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

const buildAbsoluteUrl = (siteUrl: string, url?: string, path?: string) => {
  if (url) {
    const resolved = toAbsoluteUrlFromSite(url, siteUrl)
    if (resolved) return resolved
  }
  const normalizedPath = normalizePath(path)
  if (normalizedPath) return `${siteUrl}${normalizedPath}`
  return undefined
}

const normalizeRating = (
  rating?: ReviewRatingInput,
): ReviewStructuredData["reviewRating"] => {
  if (!rating) return undefined
  const ratingValue =
    typeof rating.value === "number"
      ? rating.value.toString()
      : rating.value.trim()
  if (!ratingValue) return undefined
  return {
    "@type": "Rating",
    ratingValue,
    ...(rating.best !== undefined ? { bestRating: rating.best } : {}),
    ...(rating.worst !== undefined ? { worstRating: rating.worst } : {}),
  }
}

const normalizeItemReviewed = (
  siteUrl: string,
  item?: ReviewItemInput,
): ReviewStructuredData["itemReviewed"] => {
  if (!item) return undefined
  const name = item.name?.trim()
  const type = item.type?.trim() || "Product"
  const url = buildAbsoluteUrl(siteUrl, item.url, item.path)
  const id = item.id?.trim() || url
  if (!name && !url && !id) return undefined
  return {
    "@type": type,
    ...(name ? { name } : {}),
    ...(id ? { "@id": id } : {}),
    ...(url ? { url } : {}),
  }
}

export function buildReviewStructuredData(
  reviews: ReviewInput[],
): ReviewStructuredData[] {
  const siteUrl = resolveSiteUrl()

  return reviews
    .map((review) => {
      const reviewBody = review.body?.trim()
      const authorName = review.author?.name?.trim()
      if (!reviewBody || !authorName) return null

      const url = buildAbsoluteUrl(siteUrl, review.url, review.path)
      const id = review.id?.trim() || (url ? `${url}#review` : undefined)

      const authorUrl = review.author.url
        ? toAbsoluteUrlFromSite(review.author.url, siteUrl)
        : undefined

      const author: ReviewStructuredData["author"] = {
        "@type": review.author.type ?? "Person",
        name: authorName,
        ...(authorUrl ? { url: authorUrl } : {}),
      }

      const rating = normalizeRating(review.rating)
      const itemReviewed = normalizeItemReviewed(siteUrl, review.itemReviewed)

      return {
        "@context": "https://schema.org",
        "@type": "Review" as const,
        ...(id ? { "@id": id } : {}),
        ...(url ? { url } : {}),
        ...(review.title?.trim() ? { name: review.title.trim() } : {}),
        reviewBody,
        ...(review.datePublished?.trim()
          ? { datePublished: review.datePublished.trim() }
          : {}),
        author,
        ...(rating ? { reviewRating: rating } : {}),
        ...(itemReviewed ? { itemReviewed } : {}),
      }
    })
    .filter((review): review is ReviewStructuredData => Boolean(review))
}

export const emptyReviewStructuredData: ReviewStructuredData[] = []
