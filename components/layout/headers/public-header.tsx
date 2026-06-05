import Link from "next/link"
import { Inter } from "next/font/google"
import { Suspense } from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Input } from "@/components/atoms/input"
import {
  ANALYTICS_PATH,
  BROWSE_PATH,
  HOME_PATH,
  LEADERBOARD_PATH,
  PRICING_PATH,
} from "@/lib/routes"
import PublicHeaderActions from "./public-header-actions"
import PublicHeaderSearch from "./public-header-search"

const inter = Inter({ subsets: ["latin"] })

const headerLinks = [
  { label: "Explore", href: BROWSE_PATH },
  { label: "Leaderboard", href: LEADERBOARD_PATH },
  { label: "Analytics", href: ANALYTICS_PATH },
  { label: "Pricing", href: PRICING_PATH },
] as const

function PublicHeaderSearchFallback() {
  return (
    <div className="relative hidden items-center md:flex" aria-hidden>
      <Search className="pointer-events-none absolute left-3 size-5 text-[#74777d]" />
      <Input
        type="search"
        disabled
        placeholder="Search products..."
        className="h-auto w-64 rounded-[12px] border-[#c4c6cd] bg-[#eff4ff] py-2 pl-10 pr-4 text-[14px] leading-5 text-[#0b1c30] shadow-none placeholder:text-[#74777d] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[#0051d5]"
      />
    </div>
  )
}

export default function PublicHeader() {
  return (
    <header
      className={`${inter.className} fixed top-0 z-50 w-full border-b border-[#E2E8F0] bg-white text-[#0b1c30]`}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Button
            asChild
            variant="link"
            className="h-auto rounded-none border-0 bg-transparent p-0 text-[18px] font-bold leading-6 text-black shadow-none no-underline hover:bg-transparent hover:text-black hover:no-underline"
          >
            <Link href={HOME_PATH}>Shipyard HQ</Link>
          </Button>
          <Suspense fallback={<PublicHeaderSearchFallback />}>
            <PublicHeaderSearch />
          </Suspense>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          {headerLinks.map((link, index) => (
            <Button
              key={link.href}
              asChild
              variant="link"
              className={
                index === 0
                  ? "h-auto rounded-none border-x-0 border-t-0 border-b-2 border-[#0051d5] bg-transparent px-1 py-4 text-[14px] font-bold leading-5 text-[#0051d5] shadow-none no-underline hover:bg-transparent hover:text-[#0051d5] hover:no-underline"
                  : "h-auto rounded-none border-0 bg-transparent p-0 text-[14px] font-normal leading-5 text-[#43474c] shadow-none no-underline transition-colors hover:bg-transparent hover:text-black hover:no-underline"
              }
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <PublicHeaderActions />
      </div>
    </header>
  )
}
