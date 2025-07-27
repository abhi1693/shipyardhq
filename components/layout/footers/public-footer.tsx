"use client"

import Link from "next/link"
import { Mail, Twitter } from "lucide-react"

export default function PublicFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted/50 text-muted-foreground text-sm">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
        {/* Branding */}
        <div className="space-y-2">
          <div className="text-lg font-semibold text-foreground">
            ShipYardHQ
          </div>
          <p>Helping you launch and grow micro-SaaS products.</p>
          <div className="flex gap-3 pt-4">
            <Link href="mailto:shipyardhq.dev@gmail.com">
              <Mail className="w-5 h-5 hover:text-foreground transition" />
            </Link>
            <Link href="https://x.com/abhi16_93" target="_blank">
              <Twitter className="w-5 h-5 hover:text-foreground transition" />
            </Link>
          </div>
        </div>

        {/* Explore */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">Explore</div>
          <ul className="space-y-1">
            <li>
              <Link href="/browse" className="hover:text-foreground">
                All Products
              </Link>
            </li>
            <li>
              <Link href="/leaderboard" className="hover:text-foreground">
                Leaderboard
              </Link>
            </li>
            <li>
              <Link href="/categories" className="hover:text-foreground">
                Categories
              </Link>
            </li>
          </ul>
        </div>

        {/* Resources */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">Resources</div>
          <ul className="space-y-1">
            <li>
              <Link href="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link
                href="/member/products/add"
                className="hover:text-foreground"
              >
                Submit Product
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">Legal</div>
          <ul className="space-y-1">
            <li>
              <Link href="/legal/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t text-center py-6 text-xs text-muted-foreground">
        © {year} ShipYardHQ. All rights reserved.
      </div>
    </footer>
  )
}
