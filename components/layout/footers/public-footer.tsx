"use client"

import Link from "next/link"
import { Mail, Twitter } from "lucide-react"

export default function PublicFooter() {
  const year = new Date().getFullYear()
  const linkCls =
    "text-muted-foreground hover:text-foreground transition-colors"

  return (
    <footer className="border-t bg-muted/40 text-sm">
      {/* Brand gradient accent */}
      <div className="h-px w-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]" />

      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-block size-6 rounded-md bg-[linear-gradient(135deg,var(--brand-1),var(--brand-2))]" />
            <span className="text-lg font-semibold tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]">
              ShipYardHQ
            </span>
          </Link>
          <p className="text-muted-foreground leading-relaxed">
            Discover, launch, and grow your micro‑SaaS.
          </p>
          <div className="flex gap-3 pt-2 text-muted-foreground">
            <Link href="mailto:shipyardhq.dev@gmail.com" className={linkCls}>
              <Mail className="w-5 h-5" />
            </Link>
            <Link
              href="https://x.com/abhi16_93"
              target="_blank"
              rel="noreferrer"
              className={linkCls}
            >
              <Twitter className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Discover */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Discover
          </div>
          <ul className="space-y-2">
            <li>
              <Link href="/browse" className={linkCls}>
                All Products
              </Link>
            </li>
            <li>
              <Link href="/categories" className={linkCls}>
                Categories
              </Link>
            </li>
            <li>
              <Link href="/leaderboard" className={linkCls}>
                Leaderboard
              </Link>
            </li>
            <li>
              <Link href="/pricing" className={linkCls}>
                Pricing
              </Link>
            </li>
          </ul>
        </div>

        {/* Makers */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Makers
          </div>
          <ul className="space-y-2">
            <li>
              <Link href="/member/products/add" className={linkCls}>
                Submit Product
              </Link>
            </li>
            <li>
              <Link href="/pricing" className={linkCls}>
                Feature Your Product
              </Link>
            </li>
          </ul>
        </div>

        {/* Company & Legal */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Company
          </div>
          <ul className="space-y-2">
            <li>
              <Link href="mailto:shipyardhq.dev@gmail.com" className={linkCls}>
                Contact
              </Link>
            </li>
            <li>
              <Link
                href="https://x.com/abhi16_93"
                target="_blank"
                rel="noreferrer"
                className={linkCls}
              >
                Twitter / X
              </Link>
            </li>
          </ul>

          <div className="pt-4 text-xs font-semibold uppercase tracking-wide text-foreground">
            Legal
          </div>
          <ul className="space-y-2 mt-2">
            <li>
              <Link href="/legal/privacy-policy" className={linkCls}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className={linkCls}>
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t text-center py-6 text-xs text-muted-foreground">
        © {year} ShipYardHQ • Built for indie makers
      </div>
    </footer>
  )
}
