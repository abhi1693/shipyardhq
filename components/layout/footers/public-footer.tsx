"use client"

import Link from "next/link"
import { Mail, Twitter } from "lucide-react"

export default function PublicFooter() {
  const year = new Date().getFullYear()
  const linkCls =
    "text-muted-foreground hover:text-foreground transition-colors"

  return (
    <footer className="border-t bg-muted/40 text-sm md:text-[15px]">
      {/* Brand gradient accent */}
      <div className="h-px md:h-1 w-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 lg:py-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-12 lg:gap-16">
        {/* Brand */}
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-block size-6 md:size-7 rounded-md bg-[linear-gradient(135deg,var(--brand-1),var(--brand-2))]" />
            <span className="text-lg md:text-xl font-semibold tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]">
              ShipYardHQ
            </span>
          </Link>
          <p className="text-muted-foreground leading-relaxed max-w-xs">
            Discover, launch, and grow your micro‑SaaS.
          </p>
          <div className="flex gap-3 pt-2 text-muted-foreground">
            <Link
              href="mailto:shipyardhq.dev@gmail.com"
              className={linkCls + " hover:opacity-90"}
            >
              <Mail className="w-5 h-5 md:w-5 md:h-5" />
            </Link>
            <Link
              href="https://x.com/abhi16_93"
              target="_blank"
              rel="noreferrer"
              className={linkCls + " hover:opacity-90"}
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
              <Link href="/browse" className={linkCls + " md:font-medium"}>
                All Products
              </Link>
            </li>
            <li>
              <Link href="/categories" className={linkCls + " md:font-medium"}>
                Categories
              </Link>
            </li>
            <li>
              <Link href="/leaderboard" className={linkCls + " md:font-medium"}>
                Leaderboard
              </Link>
            </li>
            <li>
              <Link href="/pricing" className={linkCls + " md:font-medium"}>
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
                className={linkCls + " md:font-medium"}
              >
                Submit Product
              </Link>
            </li>
            <li>
              <Link href="/pricing" className={linkCls + " md:font-medium"}>
                Feature Your Product
              </Link>
            </li>
          </ul>
        </div>

        {/* Company & Legal */}
        <div className="space-y-3">
          <div className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
            Company
          </div>
          <ul className="space-y-2 md:space-y-2.5">
            <li>
              <Link
                href="mailto:shipyardhq.dev@gmail.com"
                className={linkCls + " md:font-medium"}
              >
                Contact
              </Link>
            </li>
            <li>
              <Link
                href="https://x.com/abhi16_93"
                target="_blank"
                rel="noreferrer"
                className={linkCls + " md:font-medium"}
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
                className={linkCls + " md:font-medium"}
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className={linkCls + " md:font-medium"}>
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
