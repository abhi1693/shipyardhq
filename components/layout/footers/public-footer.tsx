"use client"

import Link from "next/link"
import Image from "next/image"
import { Mail, Twitter } from "lucide-react"
import { Button } from "@/components/atoms/button"

type UseCaseLink = { label: string; slug: string }

export default function PublicFooter({
  useCases = [],
}: {
  useCases?: UseCaseLink[]
}) {
  const year = new Date().getFullYear()
  const textLinkCls =
    "relative text-muted-foreground hover:text-foreground transition-colors md:after:absolute md:after:left-0 md:after:-bottom-1 md:after:h-0.5 md:after:w-full md:after:rounded-full md:after:bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] md:after:opacity-0 md:hover:after:opacity-100 md:after:transition-opacity"
  const iconLinkCls =
    "text-muted-foreground hover:text-foreground transition-opacity hover:opacity-90"

  return (
    <footer className="border-t bg-muted/40 text-sm md:text-[15px]">
      {/* Brand gradient accent */}
      <div className="h-px md:h-1 w-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 lg:py-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10 md:gap-12 lg:gap-16">
        {/* Brand */}
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/brand.png"
              alt="ShipYardHQ"
              width={28}
              height={28}
              sizes="(min-width: 768px) 28px, 24px"
              className="h-6 w-6 md:h-7 md:w-7 object-contain"
              priority
            />
            <span className="text-lg md:text-xl font-semibold tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]">
              ShipYardHQ
            </span>
          </Link>
          <p className="text-muted-foreground leading-relaxed max-w-xs">
            Discover, launch, and grow your micro‑SaaS.
          </p>
          <div className="pt-3">
            <Link href="/browse">
              <Button size="sm">Explore Products</Button>
            </Link>
          </div>
          <div className="flex gap-3 pt-3 text-muted-foreground">
            <Link
              href="mailto:shipyardhq.dev@gmail.com"
              className={iconLinkCls}
            >
              <Mail className="w-5 h-5 md:w-5 md:h-5" />
            </Link>
            <Link
              href="https://x.com/abhi16_93"
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
          <div className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
            Discover
          </div>
          <ul className="space-y-2 md:space-y-2.5">
            <li>
              <Link href="/browse" className={textLinkCls + " md:font-medium"}>
                All Products
              </Link>
            </li>
            <li>
              <Link
                href="/categories"
                className={textLinkCls + " md:font-medium"}
              >
                Categories
              </Link>
            </li>
            <li>
              <Link
                href="/leaderboard"
                className={textLinkCls + " md:font-medium"}
              >
                Leaderboard
              </Link>
            </li>
            <li>
              <Link href="/pricing" className={textLinkCls + " md:font-medium"}>
                Pricing
              </Link>
            </li>
          </ul>
        </div>

        {/* Makers */}
        <div className="space-y-3">
          <div className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
            Makers
          </div>
          <ul className="space-y-2 md:space-y-2.5">
            <li>
              <Link
                href="/member/products/add"
                className={textLinkCls + " md:font-medium"}
              >
                Submit Product
              </Link>
            </li>
            <li>
              <Link href="/pricing" className={textLinkCls + " md:font-medium"}>
                Feature Your Product
              </Link>
            </li>
          </ul>
        </div>

        {/* Use Cases */}
        {useCases.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
              Use Cases
            </div>
            <ul className="space-y-2 md:space-y-2.5">
              {useCases.map((uc) => (
                <li key={uc.slug}>
                  <Link
                    href={`/browse?useCase=${uc.slug}`}
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
          <div className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
            Company
          </div>
          <ul className="space-y-2 md:space-y-2.5">
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
                href="https://x.com/abhi16_93"
                target="_blank"
                rel="noreferrer"
                className={textLinkCls + " md:font-medium"}
              >
                Twitter / X
              </Link>
            </li>
          </ul>

          <div className="pt-4 text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
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
      <div className="border-t text-center py-7 md:py-8 text-xs md:text-sm text-muted-foreground">
        © {year} ShipYardHQ • Built for indie makers
      </div>
    </footer>
  )
}
