import { Suspense } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/atoms/input"
import { BrandWordmark } from "@/components/molecules/BrandWordmark"
import PublicHeaderActions from "./public-header-actions"
import PublicMobileMenu from "./public-mobile-menu"
import PublicHeaderNav from "./public-header-nav"
import PublicHeaderSearch from "./public-header-search"

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
    <header className="fixed top-0 z-50 w-full border-b border-[#E2E8F0] bg-white text-[#0b1c30]">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <BrandWordmark eager compact />
          <Suspense fallback={<PublicHeaderSearchFallback />}>
            <PublicHeaderSearch />
          </Suspense>
        </div>

        <PublicHeaderNav />

        <PublicHeaderActions />
        <PublicMobileMenu />
      </div>
    </header>
  )
}
