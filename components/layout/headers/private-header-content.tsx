"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"

import { SidebarTrigger } from "@/components/atoms/sidebar"
import { UserNav } from "@/components/layout/user-nav"
import { usePrivateHeaderSlot } from "@/components/layout/headers/private-header-slot"

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
  const headerSlot = usePrivateHeaderSlot()
  const slotContent = headerSlot?.content

  return (
    <header
      className={
        slotContent
          ? "sticky top-0 z-40 flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:min-h-12 md:px-6"
          : "sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-[#f8f9ff] px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6"
      }
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {slotContent ? null : (
          <SidebarTrigger className="-ml-1 rounded-lg text-slate-500 hover:bg-[#eff4ff] hover:text-blue-700" />
        )}
        {slotContent ? (
          <div className="min-w-0 flex-1">{slotContent}</div>
        ) : (
          <h1 className="truncate text-lg font-semibold text-slate-950">
            {pageTitle}
          </h1>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <UserNav />
      </div>
    </header>
  )
}
