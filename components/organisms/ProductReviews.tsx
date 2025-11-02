import { formatDistanceToNow } from "date-fns"
import { MessageCircle } from "lucide-react"

import { submitProductReviewAction } from "@/actions/public/products/reviews"
import { Button } from "@/components/atoms/button"
import ProductReviewForm from "@/components/molecules/ProductReviewForm"
import RatingStars from "@/components/molecules/RatingStars"
import SignInButton from "@/components/molecules/SignInButton"
import type { ProductReviewSummary } from "@/lib/server/productReviews"
import { cn } from "@/lib/utils"

type ViewerReview = {
  rating: number
  message: string
} | null

type ProductReviewsProps = {
  productId: string
  productName: string
  reviewSummary: ProductReviewSummary
  viewerReview: ViewerReview
  isSignedIn: boolean
  redirectUrl: string
}

export default function ProductReviews({
  productId,
  productName,
  reviewSummary,
  viewerReview,
  isSignedIn,
  redirectUrl,
}: ProductReviewsProps) {
  const { averageRating, totalReviews, reviews } = reviewSummary
  const hasReviews = totalReviews > 0

  return (
    <section id="product-reviews" className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-muted text-foreground shadow-sm">
            <MessageCircle className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Reviews
            </h2>
            <p className="text-sm text-muted-foreground">
              {hasReviews
                ? `What builders say about ${productName}.`
                : `Be the first to share your take on ${productName}.`}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold",
            hasReviews
              ? "border-border bg-white text-foreground shadow-sm shadow-black/5"
              : "border-dashed border-border/80 text-muted-foreground",
          )}
        >
          {hasReviews ? (
            <>
              <RatingStars rating={averageRating} size={16} />
              <span>{averageRating.toFixed(1)} / 5</span>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                {totalReviews} review{totalReviews === 1 ? "" : "s"}
              </span>
            </>
          ) : (
            <span>No reviews yet</span>
          )}
        </div>
      </header>

      <div className="rounded-2xl border border-border/70 bg-white px-5 py-6 shadow-sm shadow-black/5">
        {isSignedIn ? (
          <ProductReviewForm
            productId={productId}
            action={submitProductReviewAction}
            initialRating={viewerReview?.rating ?? null}
            initialMessage={viewerReview?.message ?? null}
          />
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">
                Sign in to review
              </h3>
              <p className="text-sm text-muted-foreground">
                Join Shipyard to rate this product and share your experience.
              </p>
            </div>
            <SignInButton
              mode="modal"
              forceRedirectUrl={redirectUrl}
              signUpForceRedirectUrl={redirectUrl}
            >
              <Button variant="secondary" className="self-start">
                Sign in
              </Button>
            </SignInButton>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {hasReviews ? (
          reviews.map((review) => {
            const createdAt = normalizeDate(review.createdAt)
            return (
              <div
                key={review.id}
                className="space-y-3 py-5 first:pt-0 last:pb-0"
              >
                <article className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold text-foreground">
                        {formatName(
                          review.user.firstName,
                          review.user.lastName,
                        )}
                      </div>
                      <RatingStars rating={review.rating} size={14} />
                    </div>
                    <time
                      dateTime={createdAt.toISOString()}
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80"
                    >
                      {formatRelative(createdAt)}
                    </time>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {review.message}
                  </p>
                </article>
                <span aria-hidden className="block h-px w-full bg-border/70" />
              </div>
            )
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
            Be the first to share how {productName} performed for you.
          </div>
        )}
      </div>
    </section>
  )
}

function formatName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean)
  if (!parts.length) {
    return "Shipyard member"
  }
  return parts.join(" ")
}

function normalizeDate(input: Date | string) {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? new Date() : input
  }
  const candidate = new Date(input)
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate
}

function formatRelative(input: Date | string) {
  const value = normalizeDate(input)
  try {
    return formatDistanceToNow(value, { addSuffix: true })
  } catch {
    return "Recently"
  }
}
