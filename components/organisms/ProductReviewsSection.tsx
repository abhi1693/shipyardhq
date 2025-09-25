import { SignInButton } from "@clerk/nextjs"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/atoms/button"
import ProductReviewForm from "@/components/molecules/ProductReviewForm"
import RatingStars from "@/components/molecules/RatingStars"
import { submitProductReviewAction } from "@/actions/public/products/reviews"
import { type ProductReviewSummary } from "@/lib/server/productReviews"
import { productPageCopy } from "@/lib/copy/productPage"

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
  const { hero } = productPageCopy
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
          <p className="max-w-2xl text-sm text-muted-foreground">
            Hear how other builders experience this product and add your take to
            help the next customer.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 rounded-3xl bg-white/70 px-5 py-4 ring-1 ring-slate-200/40 shadow-[0_24px_64px_-50px_rgba(7,58,104,0.45)] backdrop-blur dark:bg-slate-900/70 dark:ring-slate-800/40">
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

      <div className="space-y-6 rounded-[32px] bg-white/65 p-8 ring-1 ring-slate-200/40 shadow-[0_35px_110px_-70px_rgba(7,58,104,0.55)] backdrop-blur dark:bg-slate-900/75 dark:ring-slate-800/40">
        <div id="product-review-form" className="scroll-mt-32 space-y-4">
          {isSignedIn ? (
            <ProductReviewForm
              productId={productId}
              action={submitProductReviewAction}
              initialRating={viewerReview?.rating ?? null}
              initialMessage={viewerReview?.message ?? null}
            />
          ) : (
            <div className="flex flex-col gap-3 rounded-3xl bg-white/60 px-5 py-4 ring-1 ring-slate-200/40 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-900/70 dark:ring-slate-800/40">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Sign in to leave a review
                </h3>
                <p className="text-sm text-muted-foreground">
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
              className="flex h-full flex-col gap-3 rounded-3xl bg-white/70 p-6 ring-1 ring-slate-200/40 shadow-[0_22px_70px_-60px_rgba(7,58,104,0.45)] dark:bg-slate-900/70 dark:ring-slate-800/40"
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
            <div className="col-span-full rounded-3xl border border-dashed border-[color:var(--brand-1)/0.25] bg-white/55 p-8 text-center text-sm text-muted-foreground dark:border-[color:var(--brand-1)/0.35] dark:bg-slate-900/60">
              Be the first to share how {productName} performed for you.
            </div>
          )}
        </div>

        <div className="sticky bottom-4 flex justify-center">
          {isSignedIn ? (
            <a
              href="#product-review-form"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--brand-2)] px-5 py-2 text-sm font-semibold text-white shadow-[0_25px_65px_-40px_rgba(7,78,134,0.5)] transition hover:bg-[color:var(--brand-2)/0.9]"
            >
              {hero.reviewsCta}
            </a>
          ) : (
            <SignInButton
              mode="modal"
              forceRedirectUrl={redirectUrl}
              signUpForceRedirectUrl={redirectUrl}
            >
              <Button className="rounded-full bg-[color:var(--brand-2)] px-5 py-2 text-sm font-semibold text-white hover:bg-[color:var(--brand-2)/0.9]">
                {hero.reviewsCta}
              </Button>
            </SignInButton>
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
