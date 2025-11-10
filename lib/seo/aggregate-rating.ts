export type AggregateRatingInput = {
  ratingValue: number | string
  ratingCount?: number
  reviewCount?: number
  bestRating?: number
  worstRating?: number
}

export type AggregateRatingStructuredData = {
  "@type": "AggregateRating"
  ratingValue: string
  ratingCount?: number
  reviewCount?: number
  bestRating?: number
  worstRating?: number
}

const toRatingValueString = (value: number | string) =>
  typeof value === "number" ? value.toString() : value.trim()

export function buildAggregateRatingStructuredData(
  input: AggregateRatingInput,
): AggregateRatingStructuredData | undefined {
  const ratingValue = toRatingValueString(input.ratingValue)
  if (!ratingValue) return undefined

  const payload: AggregateRatingStructuredData = {
    "@type": "AggregateRating",
    ratingValue,
  }

  if (typeof input.ratingCount === "number") {
    payload.ratingCount = input.ratingCount
  }
  if (typeof input.reviewCount === "number") {
    payload.reviewCount = input.reviewCount
  }
  if (typeof input.bestRating === "number") {
    payload.bestRating = input.bestRating
  }
  if (typeof input.worstRating === "number") {
    payload.worstRating = input.worstRating
  }

  return payload
}

export const emptyAggregateRatingStructuredData: AggregateRatingStructuredData = {
  "@type": "AggregateRating",
  ratingValue: "0",
}
