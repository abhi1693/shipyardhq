import { SignInButton } from "@clerk/nextjs"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/atoms/button"
import ProductReviewForm from "@/components/molecules/ProductReviewForm"
import RatingStars from "@/components/molecules/RatingStars"
import { submitProductReviewAction } from "@/actions/public/products/reviews"
import { type ProductReviewSummary } from "@/lib/server/productReviews"

interface ReviewSectionProps {
  productId: string
  productName: string
  reviewSummary: ProductReviewSummary
  viewerReview?: { rating: number; message: string } | null
  isSignedIn: boolean
  redirectUrl: string
}

export default function ProductReviewsSection({
  productId,
  productName,
  reviewSummary,
  viewerReview,
  isSignedIn,
  redirectUrl,
}: ReviewSectionProps) {
  const average = reviewSummary.averageRating
  const total = reviewSummary.totalReviews
  const hasReviews = total > 0

  return (
    <section id="product-reviews" className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-card px-6 py-8 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Community signal
            </p>
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Reviews for {productName}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Hear how other builders experienced this product and add your take to help the next customer.
            </p>
          </div>
          <div className="inline-flex flex-col gap-2 rounded-2xl border border-border/70 bg-background px-5 py-4">
            <div className="flex items-center gap-3">
              <RatingStars rating={average} />
              <span className="text-sm font-semibold text-foreground">
                {average.toFixed(1)} / 5
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {hasReviews
                ? `${total} review${total === 1 ? "" : "s"}`
                : "No reviews yet"}
            </span>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-border/70 bg-background p-6">
            <div id="product-review-form" className="scroll-mt-32 space-y-4">
              {isSignedIn ? (
                <ProductReviewForm
                  productId={productId}
                  action={submitProductReviewAction}
                  initialRating={viewerReview?.rating ?? null}
                  initialMessage={viewerReview?.message ?? null}
                />
              ) : (
                <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      Sign in to leave a review
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Join the community to rate this product and share your experience.
                    </p>
                  </div>
                  <SignInButton
                    mode="modal"
                    forceRedirectUrl={redirectUrl}
                    signUpForceRedirectUrl={redirectUrl}
                  >
                    <Button variant="secondary">Sign in</Button>
                  </SignInButton>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {reviewSummary.reviews.map((review) => (
              <article
                key={review.id}
                className="flex h-full flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">
                      {formatName(review.user.firstName, review.user.lastName)}
                    </div>
                    <RatingStars rating={review.rating} size={14} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(review.createdAt)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {review.message}
                </p>
              </article>
            ))}
            {!hasReviews && (
              <div className="col-span-full rounded-2xl border border-dashed border-[color:var(--brand-1)/0.25] bg-background p-8 text-center text-sm text-muted-foreground">
                Be the first to share how {productName} performed for you.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function formatName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean)
  if (parts.length === 0) return "Shipyard member"
  return parts.join(" ")
}

function formatRelative(date: Date) {
  try {
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return "Recently"
  }
}
