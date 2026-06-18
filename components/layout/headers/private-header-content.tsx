"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"

import { SidebarTrigger } from "@/components/atoms/sidebar"
import { UserNav } from "@/components/layout/user-nav"

const SECTION_SEGMENTS = new Set(["admin", "member"])

function formatTitleSegment(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getPageTitle(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const productsIndex = segments.indexOf("products")
  const isAddProductFlow =
    productsIndex >= 0 && segments[productsIndex + 1] === "add"
  const pageSegment =
    [...segments].reverse().find((segment) => !SECTION_SEGMENTS.has(segment)) ??
    "overview"

  if (isAddProductFlow) {
    return "Add product"
  }

  return formatTitleSegment(pageSegment)
}

export function PrivateHeaderContent() {
  const pathname = usePathname() ?? "/"
  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname])

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-[#f8f9ff] px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="-ml-1 rounded-lg text-slate-500 hover:bg-[#eff4ff] hover:text-blue-700" />
        <h1 className="truncate text-lg font-semibold text-slate-950">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <UserNav />
      </div>
    </header>
  )
}
