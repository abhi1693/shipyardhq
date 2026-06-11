"use client"

import Link from "next/link"
import { type SyntheticEvent, useState } from "react"
import { SignOutButton, useUser } from "@clerk/nextjs"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  PackagePlus,
  Search,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Input } from "@/components/atoms/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/atoms/sheet"
import {
  BROWSE_PATH,
  MEMBER_ACCOUNT_PROFILE_PATH,
  MEMBER_BASE_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
} from "@/lib/routes"
import { cn } from "@/lib/utils"
import {
  isActivePublicHeaderPath,
  publicHeaderLinks,
} from "./public-header-links"

function buildBrowseHref(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return BROWSE_PATH

  const params = new URLSearchParams({ q: trimmed })
  return `${BROWSE_PATH}?${params.toString()}`
}

export default function PublicMobileMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn } = useUser()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    router.push(buildBrowseHref(query))
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 rounded-[10px] border border-[#E2E8F0] bg-white text-[#0b1c30] shadow-none hover:border-[#c4c6cd] hover:bg-[#F8FAFC] md:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(88vw,360px)] gap-0 border-l border-[#E2E8F0] bg-white p-0 text-[#0b1c30]"
      >
        <SheetHeader className="border-b border-[#E2E8F0] px-5 py-4">
          <SheetTitle className="text-base font-semibold">
            ShipYard HQ
          </SheetTitle>
          <SheetDescription className="sr-only">
            Public navigation
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          <form
            role="search"
            aria-label="Search products"
            onSubmit={handleSubmit}
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[#74777d]"
                aria-hidden
              />
              <Input
                name="q"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
                placeholder="Search products..."
                className="h-11 w-full rounded-[12px] border-[#c4c6cd] bg-[#eff4ff] py-2 pl-10 pr-4 text-[16px] leading-5 text-[#0b1c30] shadow-none placeholder:text-[#74777d] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[#0051d5]"
              />
            </div>
          </form>

          <nav aria-label="Mobile public navigation" className="flex flex-col">
            {publicHeaderLinks.map((link) => {
              const isActive = isActivePublicHeaderPath(pathname, link.href)

              return (
                <SheetClose key={link.href} asChild>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between border-b border-[#EEF2F7] py-4 text-[15px] leading-5 transition-colors",
                      isActive
                        ? "font-bold text-[#0051d5]"
                        : "font-medium text-[#28384d] hover:text-black",
                    )}
                  >
                    {link.label}
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        isActive ? "bg-[#0051d5]" : "bg-transparent",
                      )}
                      aria-hidden
                    />
                  </Link>
                </SheetClose>
              )
            })}
          </nav>
        </div>

        <SheetFooter className="gap-3 border-t border-[#E2E8F0] px-5 py-5">
          <SheetClose asChild>
            <Button
              asChild
              className="h-11 w-full rounded-[6px] border-0 bg-black px-4 py-2 text-[13px] font-semibold leading-4 tracking-[0.04em] text-white shadow-none hover:bg-black hover:brightness-100"
            >
              <Link href={MEMBER_PRODUCTS_ADD_PATH}>
                <PackagePlus className="size-4" aria-hidden />
                Ship Product
              </Link>
            </Button>
          </SheetClose>

          {isSignedIn ? (
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-[6px] border-[#D8E0EA] bg-white text-[#28384d] shadow-none"
                >
                  <Link href={MEMBER_BASE_PATH}>
                    <LayoutDashboard className="size-4" aria-hidden />
                    Dashboard
                  </Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-[6px] border-[#D8E0EA] bg-white text-[#28384d] shadow-none"
                >
                  <Link href={MEMBER_ACCOUNT_PROFILE_PATH}>
                    <UserRound className="size-4" aria-hidden />
                    Profile
                  </Link>
                </Button>
              </SheetClose>
              <SignOutButton>
                <Button
                  type="button"
                  variant="ghost"
                  className="col-span-2 h-10 rounded-[6px] text-[#ba1a1a] hover:bg-[#fff4f4] hover:text-[#ba1a1a]"
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </Button>
              </SignOutButton>
            </div>
          ) : (
            <SheetClose asChild>
              <Button
                asChild
                type="button"
                variant="outline"
                className="h-10 w-full rounded-[6px] border-[#D8E0EA] bg-white text-[#28384d] shadow-none"
              >
                <Link href="/login">
                  <LogIn className="size-4" aria-hidden />
                  Login
                </Link>
              </Button>
            </SheetClose>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
