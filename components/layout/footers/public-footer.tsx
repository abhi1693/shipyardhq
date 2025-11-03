"use client"

import { useState, type FormEvent, useTransition } from "react"
import Link from "next/link"
import { Mail, Sparkles, Twitter } from "lucide-react"

import { BrandWordmark } from "@/components/molecules/BrandWordmark"
import DomainRatingBadge from "@/components/molecules/DomainRatingBadge"
import {
  ANALYTICS_PATH,
  BROWSE_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_GUIDE_PATH,
  ALTERNATIVES_PATH,
  MEMBER_PRODUCTS_PATH,
  PRICING_PATH,
  REWARDS_PATH,
  USERS_PATH,
  WHY_SHIPYARD_PATH,
  TRENDS_PATH,
  SHIPYARD_TWITTER_URL,
} from "@/lib/routes"
import { cn } from "@/lib/utils"
import { subscribeToNewsletterAction } from "@/actions/public/newsletter/actions"

const navLinkBase =
  "relative text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:rounded-full after:bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] after:opacity-0 hover:after:opacity-100 after:transition-opacity"

export default function PublicFooter() {
  const year = new Date().getFullYear()
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) return

    const trimmed = email.trim()
    if (!trimmed) {
      setError("Please enter your email")
      return
    }

    startTransition(async () => {
      const result = await subscribeToNewsletterAction(trimmed)
      if (result && "error" in result && result.error) {
        setSubmitted(false)
        setError(result.error)
        return
      }

      setEmail("")
      setError(null)
      setSubmitted(true)
    })
  }

  const discoverLinks = [
    { label: "All Products", href: BROWSE_PATH },
    { label: "Leaderboard", href: LEADERBOARD_PATH },
    { label: "Alternatives", href: ALTERNATIVES_PATH },
    { label: "Trend Radar", href: TRENDS_PATH },
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
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
        <section className="grid gap-y-10 gap-x-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
          <div className="space-y-5">
            <BrandWordmark />
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

          <div className="space-y-8 lg:col-span-2 lg:self-start">
            <div className="grid gap-y-8 gap-x-8 sm:grid-cols-2">
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
                        target={
                          link.href.startsWith("http") ? "_blank" : undefined
                        }
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
            </div>

            <div className="space-y-3 max-w-sm sm:max-w-full">
              {submitted ? (
                <div className="flex items-center justify-end">
                  <span className="hidden items-center gap-2 rounded-full bg-[color:var(--brand-1)/0.12] px-3 py-1 text-[11px] font-semibold text-[color:var(--brand-1)] lg:inline-flex">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    Subscribed!
                  </span>
                </div>
              ) : null}
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
                    if (error) setError(null)
                  }}
                  placeholder="you@startup.com"
                  className="h-10 w-full rounded-full border border-border/50 bg-white px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.3]"
                  aria-label="Email address"
                  required
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[color:var(--brand-1)] px-4 text-sm font-semibold text-white transition hover:brightness-105 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {isPending ? "Subscribing..." : "Join newsletter"}
                </button>
              </form>
              <div
                className={cn(
                  "text-xs",
                  error
                    ? "text-red-600"
                    : submitted
                      ? "text-[color:var(--brand-1)]"
                      : "text-muted-foreground",
                )}
                aria-live="polite"
              >
                {error ? (
                  error
                ) : submitted ? (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    Thanks! You&apos;re subscribed.
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Wednesday digest — launch signals, operator moves,
                    highlights. No spam.
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-border/30 bg-white/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
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
