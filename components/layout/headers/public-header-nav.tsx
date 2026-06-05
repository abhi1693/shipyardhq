"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/atoms/button"
import {
  ANALYTICS_PATH,
  BROWSE_PATH,
  LEADERBOARD_PATH,
  PRICING_PATH,
} from "@/lib/routes"

const headerLinks = [
  { label: "Explore", href: BROWSE_PATH },
  { label: "Leaderboard", href: LEADERBOARD_PATH },
  { label: "Analytics", href: ANALYTICS_PATH },
  { label: "Pricing", href: PRICING_PATH },
] as const

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function PublicHeaderNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden items-center gap-6 md:flex">
      {headerLinks.map((link) => {
        const isActive = isActivePath(pathname, link.href)

        return (
          <Button
            key={link.href}
            asChild
            variant="link"
            className={
              isActive
                ? "h-auto rounded-none border-x-0 border-t-0 border-b-2 border-[#0051d5] bg-transparent px-1 py-4 text-[14px] font-bold leading-5 text-[#0051d5] shadow-none no-underline hover:bg-transparent hover:text-[#0051d5] hover:no-underline"
                : "h-auto rounded-none border-0 bg-transparent p-0 text-[14px] font-normal leading-5 text-[#43474c] shadow-none no-underline transition-colors hover:bg-transparent hover:text-black hover:no-underline"
            }
          >
            <Link href={link.href} aria-current={isActive ? "page" : undefined}>
              {link.label}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}
