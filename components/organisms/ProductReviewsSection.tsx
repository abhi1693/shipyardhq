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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
            Community signal
          </p>
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Reviews for {productName}
          </h2>
          <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-200/90">
            Hear how other builders experience this product and add your take to
            help the next customer.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 rounded-3xl bg-white px-5 py-4 ring-1 ring-slate-200/70 shadow-[0_24px_64px_-50px_rgba(7,58,104,0.4)] dark:bg-slate-900 dark:ring-slate-800/50">
          <div className="flex items-center gap-3">
            <RatingStars rating={average} />
            <span className="text-sm font-semibold text-foreground">
              {average.toFixed(1)} / 5
            </span>
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-200/90">
            {hasReviews
              ? `${total} review${total === 1 ? "" : "s"}`
              : "No reviews yet"}
          </span>
        </div>
      </div>

      <div className="space-y-6 rounded-[32px] bg-white p-8 ring-1 ring-slate-200/70 shadow-[0_35px_110px_-70px_rgba(7,58,104,0.45)] dark:bg-slate-900 dark:ring-slate-800/50">
        <div id="product-review-form" className="scroll-mt-32 space-y-4">
          {isSignedIn ? (
            <ProductReviewForm
              productId={productId}
              action={submitProductReviewAction}
              initialRating={viewerReview?.rating ?? null}
              initialMessage={viewerReview?.message ?? null}
            />
          ) : (
            <div className="flex flex-col gap-3 rounded-3xl bg-white px-5 py-4 ring-1 ring-slate-200/70 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-900 dark:ring-slate-800/50">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Sign in to leave a review
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Join the community to rate this product and share your
                  experience.
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {reviewSummary.reviews.map((review) => (
            <article
              key={review.id}
              className="flex h-full flex-col gap-3 rounded-3xl bg-white p-6 ring-1 ring-slate-200/70 shadow-[0_22px_70px_-60px_rgba(7,58,104,0.4)] dark:bg-slate-900 dark:ring-slate-800/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">
                    {formatName(review.user.firstName, review.user.lastName)}
                  </div>
                  <RatingStars rating={review.rating} size={14} />
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  {formatRelative(review.createdAt)}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-200/90">
                {review.message}
              </p>
            </article>
          ))}
          {!hasReviews && (
            <div className="col-span-full rounded-3xl border border-dashed border-[color:var(--brand-1)/0.25] bg-white p-8 text-center text-sm text-slate-600 dark:border-[color:var(--brand-1)/0.35] dark:bg-slate-900 dark:text-slate-300">
              Be the first to share how {productName} performed for you.
            </div>
          )}
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
