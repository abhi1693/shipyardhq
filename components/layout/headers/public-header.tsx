import Link from "next/link"
import { Suspense } from "react"

import { BrandWordmark } from "@/components/molecules/BrandWordmark"
import PublicHeaderActions from "./public-header-actions"
import { publicHeaderLinks } from "./public-header-links"

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-white shadow-[0_18px_48px_-26px_rgba(17,24,39,0.35)]">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center gap-3 sm:gap-4">
          <BrandWordmark eager />

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {publicHeaderLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-black/70 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <Suspense fallback={null}>
          <PublicHeaderActions />
        </Suspense>
      </div>
    </header>
  )
}
