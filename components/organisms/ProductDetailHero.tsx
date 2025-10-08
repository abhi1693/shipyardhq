import Image from "next/image"
import Link from "next/link"
import { JSX } from "react"
import { CheckCircle } from "lucide-react"
import { SignInButton } from "@clerk/nextjs"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"
import { productPageCopy } from "@/lib/copy/productPage"
import { brandGradient, gradientTint } from "@/lib/ui/tints"

interface HeroBadge {
  id: string
  label: string
  icon?: JSX.Element
  className?: string
}

interface HeroPlatform {
  id: string
  label: string
  icon: JSX.Element | null
}

interface HeroTag {
  id: string
  label: string
  href: string
}

interface ProductDetailHeroProps {
  name: string
  tagline?: string | null
  logo: string
  category: { label: string; href: string }
  owner: { name: string; href: string }
  badges: HeroBadge[]
  isVerified: boolean
  primaryLinks: JSX.Element[]
  platforms: HeroPlatform[]
  tags: HeroTag[]
  reviewPrompt?: {
    isSignedIn: boolean
    redirectUrl: string
    hasReviews: boolean
  }
}

export function ProductDetailHero({
  name,
  tagline,
  logo,
  category,
  owner,
  badges,
  isVerified,
  primaryLinks,
  platforms,
  tags,
  reviewPrompt,
}: ProductDetailHeroProps) {
  const { hero, reviewPrompt: reviewCopy } = productPageCopy
  const hasPlatforms = platforms.length > 0
  const hasTags = tags.length > 0
  const showOwner = owner.name.trim().length > 0
  const hasBadgeContent = isVerified || badges.length > 0
  const showReviewPrompt = Boolean(reviewPrompt)

  return (
    <div className="space-y-6 rounded-3xl border border-border bg-white px-6 py-7 shadow-sm">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex gap-5">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm sm:h-20 sm:w-20">
            <Image
              src={logo}
              alt={`${name} logo`}
              width={96}
              height={96}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                <span>{hero.chartedLabel}</span>
                <Link
                  href={category.href}
                  className="font-semibold tracking-[0.24em] text-foreground underline decoration-border underline-offset-4 transition hover:text-foreground"
                >
                  {category.label}
                </Link>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {name}
              </h1>
              {tagline ? (
                <p className="max-w-2xl text-base text-muted-foreground">
                  {tagline}
                </p>
              ) : null}
            </div>

            {hasBadgeContent ? (
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                {isVerified ? (
                  <Badge className="flex items-center gap-1 rounded-full border border-border bg-white bg-none px-3 py-1 text-xs font-medium text-foreground shadow-none">
                    <CheckCircle className="size-3" aria-hidden />
                    Verified launch
                  </Badge>
                ) : null}
                {badges.map((badge) => (
                  <Badge
                    key={badge.id}
                    className={cn(
                      "flex items-center gap-1 rounded-full border border-border bg-white bg-none px-3 py-1 text-xs font-medium text-muted-foreground shadow-none",
                      badge.className,
                    )}
                  >
                    {badge.icon}
                    {badge.label}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {showOwner ? (
                <span>
                  {hero.ownerPrefix}{" "}
                  <Link
                    href={owner.href}
                    className="font-medium text-foreground underline decoration-dotted underline-offset-4 transition hover:text-foreground"
                  >
                    {owner.name}
                  </Link>
                </span>
              ) : null}
              <Link
                href={category.href}
                className="font-medium text-foreground underline decoration-dotted underline-offset-4 transition hover:text-foreground"
              >
                Category: {category.label}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {primaryLinks.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          {primaryLinks.map((link, index) => (
            <span key={`primary-${index}`} className="inline-flex">
              {link}
            </span>
          ))}
        </div>
      ) : null}

      {hasPlatforms ? (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Available on
          </p>
          <div className="flex flex-wrap gap-1.5">
            {platforms.map((platform) => (
              <Badge
                key={platform.id}
                variant="outline"
                className="flex items-center gap-1 rounded-full border border-border bg-white bg-none px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-none"
              >
                {platform.icon}
                {platform.label}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {hasTags ? (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Link key={tag.id} href={tag.href} className="inline-flex">
                <Badge className="rounded-full border border-border bg-white bg-none px-3 py-0.5 text-[11px] font-medium text-muted-foreground shadow-none transition hover:border-border/70">
                  {tag.label}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {showReviewPrompt && reviewPrompt ? (
        <div
          className={brandGradient(
            "relative overflow-hidden rounded-2xl border border-[color:var(--brand-1)/0.18] text-white shadow-[0_22px_48px_-32px_rgba(7,78,134,0.45)]",
          )}
        >
          <div
            aria-hidden
            className={gradientTint(
              "absolute inset-0 border-0 backdrop-blur-sm",
            )}
          />
          <div className="relative z-10 flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-white">
              <p className="text-[11px] uppercase tracking-[0.32em] text-white">
                {reviewCopy.heading}
              </p>
              <p className="text-sm text-white">{reviewCopy.body}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {reviewPrompt.isSignedIn ? (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-white/70 bg-white/95 px-4 text-[color:var(--brand-1)] shadow-none transition hover:bg-white"
                >
                  <Link href="#product-review-form">
                    {reviewPrompt.hasReviews
                      ? reviewCopy.signedInCta
                      : `Be the first to review ${name}`}
                  </Link>
                </Button>
              ) : (
                <SignInButton
                  mode="modal"
                  forceRedirectUrl={reviewPrompt.redirectUrl}
                  signUpForceRedirectUrl={reviewPrompt.redirectUrl}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/60 bg-white/90 px-4 text-[color:var(--brand-1)] shadow-none transition hover:bg-white"
                  >
                    {reviewCopy.signedOutCta}
                  </Button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
