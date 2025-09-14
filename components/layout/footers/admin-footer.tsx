"use client"

import Link from "next/link"
import Image from "next/image"

export default function AdminFooter() {
  const year = new Date().getFullYear()
  const textLinkCls =
    "relative text-muted-foreground hover:text-foreground transition-colors md:after:absolute md:after:left-0 md:after:-bottom-1 md:after:h-0.5 md:after:w-full md:after:rounded-full md:after:bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] md:after:opacity-0 md:hover:after:opacity-100 md:after:transition-opacity"

  return (
    <footer className="border-t bg-muted/40 text-sm md:text-[15px] mt-8">
      {/* Brand gradient accent */}
      <div className="h-px md:h-1 w-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
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
            Administer users, products, and platform settings.
          </p>
        </div>

        {/* Manage */}
        <div className="space-y-3">
          <div className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
            Manage
          </div>
          <ul className="space-y-2 md:space-y-2.5">
            <li>
              <Link
                href="/admin/overview"
                className={textLinkCls + " md:font-medium"}
              >
                Overview
              </Link>
            </li>
            <li>
              <Link
                href="/admin/users"
                className={textLinkCls + " md:font-medium"}
              >
                Users
              </Link>
            </li>
            <li>
              <Link
                href="/admin/organizations"
                className={textLinkCls + " md:font-medium"}
              >
                Organizations
              </Link>
            </li>
            <li>
              <Link
                href="/admin/products"
                className={textLinkCls + " md:font-medium"}
              >
                Products
              </Link>
            </li>
            <li>
              <Link
                href="/admin/categories"
                className={textLinkCls + " md:font-medium"}
              >
                Categories
              </Link>
            </li>
            <li>
              <Link
                href="/admin/plans"
                className={textLinkCls + " md:font-medium"}
              >
                Plans
              </Link>
            </li>
          </ul>
        </div>

        {/* Account */}
        <div className="space-y-3">
          <div className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
            Account
          </div>
          <ul className="space-y-2 md:space-y-2.5">
            <li>
              <Link
                href="/admin/account/profile"
                className={textLinkCls + " md:font-medium"}
              >
                Profile
              </Link>
            </li>
            <li>
              <Link
                href="/member/overview"
                className={textLinkCls + " md:font-medium"}
              >
                Member Area
              </Link>
            </li>
          </ul>
        </div>

        {/* Help */}
        <div className="space-y-3">
          <div className="text-xs md:text-sm font-semibold uppercase tracking-wide leading-none text-foreground">
            Help
          </div>
          <ul className="space-y-2 md:space-y-2.5">
            <li>
              <Link
                href="mailto:shipyardhq.dev@gmail.com"
                className={textLinkCls + " md:font-medium"}
              >
                Contact Support
              </Link>
            </li>
            <li>
              <Link href="/" className={textLinkCls + " md:font-medium"}>
                Home
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t text-center py-6 md:py-7 text-xs md:text-sm text-muted-foreground">
        © {year} ShipYardHQ • Admin Area
      </div>
    </footer>
  )
}
