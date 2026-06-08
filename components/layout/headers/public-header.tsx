import Link from "next/link"
import { Suspense } from "react"
import { Menu, PackagePlus, Search } from "lucide-react"

import { BrandWordmark } from "@/components/molecules/BrandWordmark"
import { BROWSE_PATH, MEMBER_PRODUCTS_ADD_PATH } from "@/lib/routes"
import { publicHeaderLinks } from "./public-header-links"
import PublicHeaderSearch from "./public-header-search"

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

function PublicHeaderNav() {
  return (
    <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
      {publicHeaderLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-[14px] font-normal leading-5 text-[#43474c] transition-colors hover:text-black"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}

function PublicHeaderActions() {
  return (
    <div className="hidden items-center gap-3 md:flex">
      <Link
        href={MEMBER_PRODUCTS_ADD_PATH}
        className="inline-flex rounded-[4px] bg-black px-4 py-2 text-[12px] font-semibold leading-4 tracking-[0.05em] text-white transition-transform hover:scale-95"
      >
        Ship Product
      </Link>
      <Link
        href="/login"
        className="inline-flex size-8 items-center justify-center rounded-[4px] text-[12px] font-medium leading-4 text-[#43474c] hover:bg-[#F8FAFC] hover:text-black"
        aria-label="Sign in"
      >
        Login
      </Link>
    </div>
  )
}

function PublicMobileMenu() {
  return (
    <details className="group md:hidden">
      <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white text-[#0b1c30] shadow-none hover:border-[#c4c6cd] hover:bg-[#F8FAFC] [&::-webkit-details-marker]:hidden">
        <Menu className="size-5" aria-hidden />
        <span className="sr-only">Open menu</span>
      </summary>
      <div className="fixed inset-x-0 top-16 z-[60] border-b border-[#E2E8F0] bg-white px-4 py-5 shadow-[0_24px_48px_-32px_rgba(11,28,48,0.5)]">
        <form role="search" aria-label="Search products" action={BROWSE_PATH}>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[#74777d]"
              aria-hidden
            />
            <input
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Search products..."
              className="h-11 w-full rounded-[12px] border border-[#c4c6cd] bg-[#eff4ff] py-2 pl-10 pr-4 text-[16px] leading-5 text-[#0b1c30] outline-none placeholder:text-[#74777d] focus:border-transparent focus:ring-2 focus:ring-[#0051d5]"
            />
          </div>
        </form>

        <nav aria-label="Mobile public navigation" className="mt-4 flex flex-col">
          {publicHeaderLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-b border-[#EEF2F7] py-4 text-[15px] font-medium leading-5 text-[#28384d] transition-colors hover:text-black"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-5 grid gap-3">
          <Link
            href={MEMBER_PRODUCTS_ADD_PATH}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-black px-4 py-2 text-[13px] font-semibold leading-4 tracking-[0.04em] text-white"
          >
            <PackagePlus className="size-4" aria-hidden />
            Ship Product
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 w-full items-center justify-center rounded-[6px] border border-[#D8E0EA] bg-white text-sm font-medium text-[#28384d]"
          >
            Login
          </Link>
        </div>
      </div>
    </details>
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
