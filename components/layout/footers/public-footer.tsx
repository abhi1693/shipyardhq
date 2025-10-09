"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Mail, Rocket, Sparkles, Twitter } from "lucide-react"

import { BrandLogo } from "@/components/atoms/brand-logo"
import DomainRatingBadge from "@/components/molecules/DomainRatingBadge"
import {
  ANALYTICS_PATH,
  BROWSE_PATH,
  HOME_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_GUIDE_PATH,
  MEMBER_PRODUCTS_PATH,
  PRICING_PATH,
  REWARDS_PATH,
  USERS_PATH,
  WHY_SHIPYARD_PATH,
  usecasePath,
  SHIPYARD_TWITTER_URL,
} from "@/lib/routes"
import { cn } from "@/lib/utils"
import { launchPrimaryButton, launchSecondaryButton } from "@/lib/ui/buttons"
import { brandGradient, gradientTint } from "@/lib/ui/tints"

type UseCaseLink = { label: string; slug: string }

interface PublicFooterProps {
  useCases?: UseCaseLink[]
}

const navLinkBase =
  "relative text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:rounded-full after:bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] after:opacity-0 hover:after:opacity-100 after:transition-opacity"

export default function PublicFooter({ useCases = [] }: PublicFooterProps) {
  const year = new Date().getFullYear()
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    setEmail("")
  }

  const discoverLinks = [
    { label: "All Products", href: BROWSE_PATH },
    { label: "Leaderboard", href: LEADERBOARD_PATH },
    { label: "Rewards", href: REWARDS_PATH },
    { label: "Analytics", href: ANALYTICS_PATH },
    { label: "Pricing", href: PRICING_PATH },
    { label: "How scoring works", href: LEADERBOARD_GUIDE_PATH },
  ]

  const launchLinks = [
    { label: "Submit your product", href: MEMBER_PRODUCTS_PATH },
    { label: "Feature placements", href: PRICING_PATH },
    { label: "Makers directory", href: USERS_PATH },
    { label: "Investor updates", href: WHY_SHIPYARD_PATH },
  ]

  const companyLinks = [
    { label: "Why Shipyard", href: WHY_SHIPYARD_PATH },
    { label: "Contact the team", href: "mailto:support@shipyardhq.dev" },
    { label: "Shipyard on X", href: SHIPYARD_TWITTER_URL, external: true },
  ]

  return (
    <footer className="border-t bg-gradient-to-b from-white via-white to-white/90 text-sm text-foreground">
      <section
        className={brandGradient(
          "relative w-full overflow-hidden border-b border-[color:var(--brand-1)/0.15] px-4 py-10 text-white shadow-[0_40px_120px_-60px_rgba(18,66,112,0.8)] md:px-8",
        )}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-3">
              <span
                className={gradientTint(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80",
                )}
              >
                Launch update
              </span>
              <h2 className="text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
                Ready to put your next launch on the Shipyard spotlight?
              </h2>
              <p className="text-sm text-white/80 md:text-base">
                Showcase your drop to thousands of engaged builders, investors,
                and operator-fans. Feature placements bundle homepage,
                leaderboard, and Insights signals in one launch console.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={MEMBER_PRODUCTS_PATH}
                className={launchPrimaryButton()}
              >
                <Rocket className="h-4 w-4" aria-hidden="true" />
                Submit your launch
              </Link>
              <Link href={PRICING_PATH} className={launchSecondaryButton()}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Book a spotlight tour
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
        <section className="grid gap-y-10 gap-x-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))_minmax(0,1.15fr)]">
          <div className="space-y-5">
            <Link
              href={HOME_PATH}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/80 px-3 py-2 shadow-sm"
            >
              <BrandLogo
                width={28}
                height={28}
                sizes="(min-width: 768px) 28px, 24px"
                className="h-7 w-7"
                priority
              />
              <span className="text-lg font-semibold tracking-tight text-[color:var(--brand-1)]">
                ShipYardHQ
              </span>
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground lg:max-w-sm">
              Shipyard is the launch directory built for founders shipping fast,
              investors watching the radar, and operator-fans who amplify
              breakout products.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="mailto:support@shipyardhq.dev"
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email the team
              </Link>
              <Link
                href={SHIPYARD_TWITTER_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <Twitter className="h-4 w-4" aria-hidden="true" />
                Follow on X
              </Link>
            </div>
            <DomainRatingBadge className="pt-2" />
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.26em] text-[color:var(--brand-1)]">
              Discover
            </h3>
            <ul className="space-y-2">
              {discoverLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={navLinkBase}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.26em] text-[color:var(--brand-1)]">
              Launch
            </h3>
            <ul className="space-y-2">
              {launchLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={navLinkBase}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      link.href.startsWith("http") ? "noreferrer" : undefined
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.26em] text-[color:var(--brand-1)]">
              Popular use cases
            </h3>
            {useCases.length ? (
              <ul className="space-y-2">
                {useCases.slice(0, 6).map((uc) => (
                  <li key={uc.slug}>
                    <Link href={usecasePath(uc.slug)} className={navLinkBase}>
                      {uc.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground/80">
                Explore the browse directory to see launches by problem space.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.26em] text-[color:var(--brand-1)]">
              Company
            </h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={navLinkBase}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noreferrer" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 max-w-sm lg:max-w-xs xl:max-w-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--brand-1)]">
                Stay in the loop
              </h3>
              {submitted ? (
                <span className="hidden items-center gap-2 rounded-full bg-[color:var(--brand-1)/0.12] px-3 py-1 text-[11px] font-semibold text-[color:var(--brand-1)] lg:inline-flex">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Subscribed!
                </span>
              ) : null}
            </div>
            <form
              className="flex w-full flex-col gap-3 rounded-2xl border border-border/60 bg-white/75 p-3 shadow-sm"
              onSubmit={handleSubmit}
              noValidate
            >
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (submitted) setSubmitted(false)
                }}
                placeholder="you@startup.com"
                className="h-10 w-full rounded-full border border-border/50 bg-white px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.3]"
                aria-label="Email address"
                required
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-full bg-[color:var(--brand-1)] px-4 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Join newsletter
              </button>
            </form>
            <div className="text-xs text-muted-foreground">
              {!submitted ? (
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Wednesday digest — launch signals, operator moves, highlights.
                  No spam.
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-[color:var(--brand-1)] lg:hidden">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Thanks! You&apos;re subscribed.
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-border/30 bg-white/80">
        <div className="flex w-full flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <span>
            © {year} ShipYardHQ • Built for indie makers and operator-fans.
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/legal/privacy-policy"
              className={cn(navLinkBase, "text-xs font-semibold")}
            >
              Privacy
            </Link>
            <Link
              href="/legal/terms"
              className={cn(navLinkBase, "text-xs font-semibold")}
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
