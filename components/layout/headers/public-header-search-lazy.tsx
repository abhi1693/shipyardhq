"use client"

import dynamic from "next/dynamic"
import { Search } from "lucide-react"

import { BROWSE_PATH } from "@/lib/routes"

const PublicHeaderSearch = dynamic(() => import("./public-header-search"), {
  ssr: false,
  loading: () => <PublicHeaderSearchFallback />,
})

function PublicHeaderSearchFallback() {
  return (
    <form
      role="search"
      aria-label="Search products"
      action={BROWSE_PATH}
      className="relative hidden items-center md:flex"
    >
      <Search className="pointer-events-none absolute left-3 size-5 text-[#74777d]" />
      <input
        name="q"
        type="search"
        autoComplete="off"
        placeholder="Search products..."
        className="h-auto w-64 rounded-[12px] border border-[#c4c6cd] bg-[#eff4ff] py-2 pl-10 pr-4 text-[14px] leading-5 text-[#0b1c30] shadow-none outline-none placeholder:text-[#74777d] focus:border-transparent focus:ring-2 focus:ring-[#0051d5]"
      />
    </form>
  )
}

export default function LazyPublicHeaderSearch() {
  return <PublicHeaderSearch />
}
