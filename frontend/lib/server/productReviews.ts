export type ProductReviewView = {
  id: string
  rating: number
  message: string
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    firstName: string | null
    lastName: string | null
  }
}

export type ProductReviewSummary = {
  averageRating: number
  totalReviews: number
  reviews: ProductReviewView[]
}

/**
 * Product reviews have been removed. This file retains only shared types to
 * avoid cascading type breakage in legacy components.
 */
