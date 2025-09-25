import Image from "next/image"
import Link from "next/link"
import { JSX } from "react"
import { CheckCircle } from "lucide-react"

import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"
import { productPageCopy } from "@/lib/copy/productPage"

interface HeroBadge {
  id: string
  label: string
  icon?: JSX.Element
  className?: string
}

interface HeroLink {
  href: string
  label: string
  icon: JSX.Element
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

interface HeroStat {
  label: string
  value: string
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
  secondaryLinks: HeroLink[]
  platforms: HeroPlatform[]
  tags: HeroTag[]
  stats: HeroStat[]
  supportCard: JSX.Element
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
  secondaryLinks,
  platforms,
  tags,
  stats,
  supportCard,
  reviewPrompt,
}: ProductDetailHeroProps) {
  const { hero } = productPageCopy
  const hasSecondaryLinks = secondaryLinks.length > 0
  const hasPlatforms = platforms.length > 0
  const hasTags = tags.length > 0
  const hasStats = stats.length > 0
  const reviewCopy = productPageCopy.reviewPrompt

  return (
    <div className="relative">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,360px)] lg:items-start">
        <div className="space-y-10 lg:space-y-12">
          <header className="space-y-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-3xl border border-white/30 bg-white/80 shadow-[0_18px_45px_-30px_rgba(7,58,104,0.55)] ring-1 ring-slate-200/40 backdrop-blur sm:h-24 sm:w-24 dark:bg-slate-900/70 dark:ring-slate-700/40">
                <Image
                  src={logo}
                  alt={`${name} logo`}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 space-y-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                    <span>{hero.chartedLabel}</span>
                    <Link
                      href={category.href}
                      className="font-semibold tracking-[0.2em] text-foreground underline decoration-[color:var(--brand-1)/0.45] underline-offset-4 transition-colors hover:decoration-[color:var(--brand-1)/0.7]"
                    >
                      {category.label}
                    </Link>
                  </div>
                  <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                    {name}
                  </h1>
                {tagline ? (
                  <p className="max-w-2xl text-base text-slate-600 sm:text-lg dark:text-slate-200/90">
                    {tagline}
                  </p>
                ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {isVerified ? (
                <Badge className="flex items-center gap-1 rounded-full border border-[color:var(--brand-2)/0.35] bg-[color:var(--brand-2)/0.12] px-3 py-1 text-[color:var(--brand-2)]">
                  <CheckCircle className="size-3" aria-hidden /> Verified domain
                </Badge>
              ) : null}
              {badges.map((badge) => (
                <Badge
                  key={badge.id}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
                    badge.className,
                  )}
                >
                  {badge.icon}
                  {badge.label}
                </Badge>
              ))}
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-200/90">
              {hero.ownerPrefix}{" "}
              <Link
                href={owner.href}
                className="font-medium text-foreground underline decoration-dotted underline-offset-4 transition-colors hover:text-[color:var(--brand-1)]"
              >
                {owner.name}
              </Link>
            </div>

            {primaryLinks.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {primaryLinks.map((link, index) => (
                  <span key={`primary-${index}`} className="inline-flex">
                    {link}
                  </span>
                ))}
              </div>
            ) : null}

          </header>

          {hasPlatforms ? (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                Sails hoisted for
              </p>
              <div className="flex flex-wrap gap-1.5">
                {platforms.map((platform) => (
                  <Badge
                    key={platform.id}
                    variant="outline"
                    className="flex items-center gap-1 rounded-full border-slate-200/60 bg-white/40 px-2.5 py-0.5 text-[11px] text-[color:var(--brand-1)] dark:border-slate-700/50 dark:bg-slate-900/60"
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
              <p className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--brand-1)]">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Link key={tag.id} href={tag.href} className="inline-flex">
                    <Badge className="rounded-full border border-slate-200/60 bg-white/50 px-3 py-0.5 text-[11px] font-medium text-[color:var(--brand-1)] transition hover:border-[color:var(--brand-1)/0.4] hover:bg-white dark:border-slate-700/50 dark:bg-slate-900/60 dark:text-slate-100">
                      {tag.label}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {reviewPrompt ? (
            <div className="rounded-[28px] bg-white px-6 py-5 ring-1 ring-slate-200/70 shadow-[0_24px_70px_-55px_rgba(7,58,104,0.35)] dark:bg-slate-900/80 dark:ring-slate-800/50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
                    {reviewCopy.heading}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-200/90">
                    {reviewCopy.body}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {reviewPrompt.isSignedIn ? (
                    <Button asChild size="sm" className="px-4">
                      <Link href="#product-review-form">
                        {reviewPrompt.hasReviews
                          ? reviewCopy.signedInCta
                          : `Be the first to review ${name}`}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="sm"
                      className="px-4"
                      variant="outline"
                    >
                      <Link
                        href={`/sign-in?redirect_url=${encodeURIComponent(reviewPrompt.redirectUrl)}`}
                      >
                        {reviewCopy.signedOutCta}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28">
          {supportCard}
          {hasStats ? (
            <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/70 shadow-[0_24px_80px_-60px_rgba(7,58,104,0.35)] dark:bg-slate-900/85 dark:ring-slate-800/60">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300">
                Voyage details
              </p>
              <dl className="mt-4 space-y-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="space-y-1">
                    <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
                      {stat.label}
                    </dt>
                    <dd className="text-base font-semibold text-foreground">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          {hasSecondaryLinks ? (
            <div className="flex items-center justify-center gap-2 rounded-full bg-white/80 p-1 ring-1 ring-slate-200/60 backdrop-blur dark:bg-slate-900/70 dark:ring-slate-800/50">
              {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--brand-1)] transition hover:bg-white hover:text-[color:var(--brand-2)] dark:hover:bg-slate-800"
                >
                  {link.icon}
                </Link>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
