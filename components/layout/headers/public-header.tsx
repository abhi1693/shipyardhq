import { Suspense } from "react"

import { BrandWordmark } from "@/components/molecules/BrandWordmark"
import PublicHeaderAuth from "./public-header-auth"
import PublicHeaderNav from "./public-header-nav"
import LazyPublicHeaderSearch from "./public-header-search-lazy"

export default function PublicHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-[#E2E8F0] bg-white text-[#0b1c30]">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <BrandWordmark eager compact />
          <LazyPublicHeaderSearch />
        </div>

        <Suspense fallback={null}>
          <PublicHeaderNav />
        </Suspense>

        <PublicHeaderAuth />
      </div>
    </header>
  )
}
