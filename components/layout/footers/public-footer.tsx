import Link from "next/link"
import { Globe2, Rss, Users } from "lucide-react"

import { BRAND_NAME } from "@/lib/brand"
import {
  ANALYTICS_PATH,
  BROWSE_PATH,
  LEADERBOARD_PATH,
  LEGAL_PRIVACY_PATH,
  LEGAL_TERMS_PATH,
  MEMBER_BASE_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
  PRICING_PATH,
  REWARDS_PATH,
  USERS_PATH,
  WHY_SHIPYARD_PATH,
} from "@/lib/routes"

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Ship a Product", href: MEMBER_PRODUCTS_ADD_PATH },
      { label: "Pricing", href: PRICING_PATH },
      { label: "Why Shipyard", href: WHY_SHIPYARD_PATH },
      { label: "Analytics", href: ANALYTICS_PATH },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Browse Products", href: BROWSE_PATH },
      { label: "Leaderboard", href: LEADERBOARD_PATH },
      { label: "Makers", href: USERS_PATH },
      { label: "Rewards", href: REWARDS_PATH },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: LEGAL_TERMS_PATH },
      { label: "Privacy Policy", href: LEGAL_PRIVACY_PATH },
      { label: "Cookie Policy", href: LEGAL_PRIVACY_PATH },
      { label: "Contact", href: `${LEGAL_PRIVACY_PATH}#contact` },
    ],
  },
] as const

export default function PublicFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-16 text-[#0b1c30] sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div>
            <Link href="/" className="mb-4 block text-lg font-black text-black">
              {BRAND_NAME}
            </Link>
            <p className="mb-6 text-sm leading-5 text-[#43474c]">
              A focused discovery engine for launch-ready digital products and
              independent builders.
            </p>
            <div className="flex gap-3 text-[#43474c]">
              <Link
                href="/"
                className="opacity-60 transition-opacity hover:opacity-100"
                aria-label="Shipyard website"
              >
                <Globe2 className="size-5" aria-hidden />
              </Link>
              <Link
                href={USERS_PATH}
                className="opacity-60 transition-opacity hover:opacity-100"
                aria-label="Shipyard community"
              >
                <Users className="size-5" aria-hidden />
              </Link>
              <Link
                href="/llms.txt"
                className="opacity-60 transition-opacity hover:opacity-100"
                aria-label="Shipyard feed"
              >
                <Rss className="size-5" aria-hidden />
              </Link>
            </div>
          </div>

          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={`${column.title} footer links`}>
              <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-black">
                {column.title}
              </p>
              <ul className="space-y-4">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      prefetch={
                        link.href.startsWith(`${MEMBER_BASE_PATH}/`)
                          ? false
                          : undefined
                      }
                      className="text-sm leading-5 text-[#43474c] transition-colors hover:text-[#0051d5]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E2E8F0] pt-8 md:flex-row">
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#43474c]">
            © {year} {BRAND_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#16a34a]" />
            <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#43474c]">
              Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
