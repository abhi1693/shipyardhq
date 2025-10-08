import Image from "next/image"
import Link from "next/link"
import { JSX } from "react"
import { CheckCircle, Tag as TagIcon } from "lucide-react"
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

const PLATFORM_TONE_MAP: Record<string, string> = {
  web: "bg-sky-500/10 text-sky-700 ring-sky-500/30",
  ios: "bg-slate-500/10 text-slate-700 ring-slate-500/30",
  android: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30",
  mac: "bg-zinc-500/10 text-zinc-700 ring-zinc-500/30",
  windows: "bg-blue-500/10 text-blue-700 ring-blue-500/30",
  linux: "bg-amber-500/10 text-amber-700 ring-amber-500/25",
  chrome_extension: "bg-orange-500/10 text-orange-700 ring-orange-500/30",
  firefox_extension: "bg-amber-500/10 text-amber-700 ring-amber-500/25",
}

function platformToneClass(platformId: string) {
  return (
    PLATFORM_TONE_MAP[platformId] ??
    "bg-muted/40 text-muted-foreground ring-border/60"
  )
}

const TAG_TONE_CLASSES = [
  "bg-violet-500/12 text-violet-700 ring-violet-500/30",
  "bg-rose-500/12 text-rose-700 ring-rose-500/30",
  "bg-sky-500/12 text-sky-700 ring-sky-500/30",
  "bg-emerald-500/12 text-emerald-700 ring-emerald-500/30",
  "bg-amber-400/12 text-amber-700 ring-amber-500/25",
]

function tagToneClass(index: number) {
  if (TAG_TONE_CLASSES.length === 0) {
    return "bg-muted/40 text-muted-foreground ring-border/60"
  }
  return TAG_TONE_CLASSES[index % TAG_TONE_CLASSES.length]
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
  const showOwnerMeta = showOwner
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
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80">
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
                  {hero.chartedLabel}
                </span>
                <Link
                  href={category.href}
                  className="inline-flex items-center gap-1 rounded-full border border-transparent bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground transition hover:border-border/70 hover:bg-white"
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

            {showOwnerMeta ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span>
                  {hero.ownerPrefix}{" "}
                  <Link
                    href={owner.href}
                    className="font-medium text-foreground underline decoration-dotted underline-offset-4 transition hover:text-foreground"
                  >
                    {owner.name}
                  </Link>
                </span>
              </div>
            ) : null}
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

      {hasPlatforms || hasTags ? (
        <div
          className={cn(
            "grid gap-4",
            hasPlatforms && hasTags ? "md:grid-cols-2" : "md:grid-cols-1",
          )}
        >
          {hasPlatforms ? (
            <section className="rounded-2xl border border-border/60 bg-white/60 p-4 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.35)] backdrop-blur">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/75">
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
                  ON
                </span>
                Available on
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {platforms.map((platform) => (
                  <span
                    key={platform.id}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset shadow-[0_10px_25px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-px",
                      platformToneClass(platform.id),
                    )}
                  >
                    {platform.icon ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-muted-foreground">
                        {platform.icon}
                      </span>
                    ) : null}
                    <span className="tracking-[0.015em]">{platform.label}</span>
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {hasTags ? (
            <section className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.35)] backdrop-blur">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/75">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-muted/30 text-foreground/80">
                  <TagIcon className="size-3" aria-hidden />
                </span>
                Signal tags
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Link
                    key={tag.id}
                    href={tag.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset shadow-[0_10px_25px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring/30",
                      tagToneClass(index),
                    )}
                  >
                    <span
                      className="inline-flex size-1.5 rounded-full bg-current opacity-70"
                      aria-hidden
                    />
                    <span className="tracking-[0.02em]">{tag.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
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
