"use client"

import Link from "next/link"
import { Mail, Twitter } from "lucide-react"
import { Button } from "@/components/atoms/button"
import { getWaveBackground } from "@/lib/nautical"
import { BrandLogo } from "@/components/atoms/brand-logo"
import {
  ANALYTICS_PATH,
  BROWSE_PATH,
  CATEGORIES_PATH,
  HOME_PATH,
  LEADERBOARD_PATH,
  LEADERBOARD_GUIDE_PATH,
  MEMBER_PRODUCTS_PATH,
  PRICING_PATH,
  USERS_PATH,
  WHY_SHIPYARD_PATH,
  usecasePath,
  SHIPYARD_TWITTER_URL,
} from "@/lib/routes"

type UseCaseLink = { label: string; slug: string }

export default function PublicFooter({
  useCases = [],
}: {
  useCases?: UseCaseLink[]
}) {
  const year = new Date().getFullYear()
  const textLinkCls =
    "relative text-[color:var(--brand-1)/0.85] hover:text-[color:var(--brand-1)] transition-colors md:after:absolute md:after:left-0 md:after:-bottom-1 md:after:h-0.5 md:after:w-full md:after:rounded-full md:after:bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] md:after:opacity-0 md:hover:after:opacity-100 md:after:transition-opacity"
  const iconLinkCls =
    "text-[color:var(--brand-1)/0.75] transition-transform duration-200 hover:text-[color:var(--brand-1)] hover:-translate-y-0.5"

  return (
    <footer className="relative isolate overflow-hidden border-t text-sm md:text-[15px]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(245,250,255,0.96),rgba(233,243,252,0.94)55%,rgba(220,236,250,0.92))] dark:bg-[linear-gradient(180deg,rgba(3,18,35,0.94),rgba(3,26,48,0.94)55%,rgba(7,32,55,0.92))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-45"
        style={{
          ...getWaveBackground("220px 90px"),
          backgroundPosition: "0 58%",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-20%] top-[-55px] -z-10 h-52 rounded-[50%] bg-[radial-gradient(82%_100%_at_50%_0%,var(--brand-2)/0.28,transparent_80%)] blur-3xl"
      />

      {/* Brand gradient accent */}
      <div className="relative z-10 h-px md:h-1 w-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 lg:py-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10 md:gap-12 lg:gap-16 text-foreground">
        {/* Brand */}
        <div className="space-y-3">
          <Link href={HOME_PATH} className="inline-flex items-center gap-2">
            <BrandLogo
              width={28}
              height={28}
              sizes="(min-width: 768px) 28px, 24px"
              className="h-6 w-6 md:h-7 md:w-7"
              priority
            />
            <span className="text-lg md:text-xl font-semibold tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]">
              ShipYardHQ
            </span>
          </Link>
          <p className="text-[color:var(--brand-1)/0.82] leading-relaxed max-w-xs">
            Discover, launch, and grow your micro‑SaaS fleet.
          </p>
          <div className="pt-3">
            <Button size="sm" asChild>
              <Link href={BROWSE_PATH} role="button">
                Explore Products
              </Link>
            </Button>
          </div>
          <div className="flex gap-3 pt-3">
            <Link
              href="mailto:shipyardhq.dev@gmail.com"
              className={iconLinkCls}
            >
              <Mail className="w-5 h-5 md:w-5 md:h-5" />
            </Link>
            <Link
              href={SHIPYARD_TWITTER_URL}
              target="_blank"
              rel="noreferrer"
              className={iconLinkCls}
            >
              <Twitter className="w-5 h-5 md:w-5 md:h-5" />
            </Link>
          </div>
        </div>

        {/* Discover */}
        <div className="space-y-3">
          <div className="text-xs md:text-sm font-semibold uppercase tracking-[0.26em] text-[color:var(--brand-1)]">
            Discover
          </div>
          <ul className="space-y-2 md:space-y-2.5">
            <li>
              <Link
                href={BROWSE_PATH}
                className={textLinkCls + " md:font-medium"}
              >
                All Products
              </Link>
            </li>
            <li>
              <Link
                href={CATEGORIES_PATH}
                className={textLinkCls + " md:font-medium"}
              >
                Categories
              </Link>
            </li>
            <li>
              <Link
                href={LEADERBOARD_PATH}
                className={textLinkCls + " md:font-medium"}
              >
                Leaderboard
              </Link>
            </li>
            <li>
              <Link
                href={LEADERBOARD_GUIDE_PATH}
                className={textLinkCls + " md:font-medium"}
              >
                How scoring works
              </Link>
            </li>
            <li>
              <Link
                href={ANALYTICS_PATH}
                className={textLinkCls + " md:font-medium"}
              >
                Analytics
              </Link>
            </li>
            <li>
              <Link
                href={PRICING_PATH}
                className={textLinkCls + " md:font-medium"}
              >
                Pricing
              </Link>
            </li>
          </ul>
        </div>

        {/* Makers */}
        <div className="space-y-3">
          <div className="text-xs md:text-sm font-semibold uppercase tracking-[0.26em] text-[color:var(--brand-1)]">
            Makers
          </div>
          <ul className="space-y-2 md:space-y-2.5">
            <li>
              <Link
                href={USERS_PATH}
                className={textLinkCls + " md:font-medium"}
              >
                Makers Directory
              </Link>
            </li>
            <li>
              <Link
                href={MEMBER_PRODUCTS_PATH}
                className={textLinkCls + " md:font-medium"}
              >
                Submit Product
              </Link>
            </li>
            <li>
              <Link
                href={PRICING_PATH}
                className={textLinkCls + " md:font-medium"}
              >
                Feature Your Product
              </Link>
            </li>
          </ul>
        </div>

        {/* Use Cases */}
        {useCases.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs md:text-sm font-semibold uppercase tracking-[0.26em] text-[color:var(--brand-1)]">
              Use Cases
            </div>
            <ul className="space-y-2 md:space-y-2.5">
              {useCases.map((uc) => (
                <li key={uc.slug}>
                  <Link
                    href={usecasePath(uc.slug)}
                    className={textLinkCls + " md:font-medium"}
                  >
                    {uc.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Company & Legal */}
        <div className="space-y-3">
          <div className="text-xs md:text-sm font-semibold uppercase tracking-[0.26em] text-[color:var(--brand-1)]">
            Company
          </div>
          <ul className="space-y-2 md:space-y-2.5">
            <li>
              <Link
                href={WHY_SHIPYARD_PATH}
                className={textLinkCls + " md:font-medium"}
              >
                Why Shipyard
              </Link>
            </li>
            <li>
              <Link
                href="mailto:shipyardhq.dev@gmail.com"
                className={textLinkCls + " md:font-medium"}
              >
                Contact
              </Link>
            </li>
            <li>
              <Link
                href={SHIPYARD_TWITTER_URL}
                target="_blank"
                rel="noreferrer"
                className={textLinkCls + " md:font-medium"}
              >
                Twitter / X
              </Link>
            </li>
          </ul>

          <div className="pt-4 text-xs md:text-sm font-semibold uppercase tracking-[0.26em] text-[color:var(--brand-1)]">
            Legal
          </div>
          <ul className="space-y-2 md:space-y-2.5 mt-2">
            <li>
              <Link
                href="/legal/privacy-policy"
                className={textLinkCls + " md:font-medium"}
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/legal/terms"
                className={textLinkCls + " md:font-medium"}
              >
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 border-t border-[color:var(--brand-1)/0.2] bg-background/80 text-center py-7 md:py-8 text-xs md:text-sm text-[color:var(--brand-1)/0.65] backdrop-blur">
        © {year} ShipYardHQ • Built for indie makers
      </div>
    </footer>
  )
}
