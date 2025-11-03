"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/atoms/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/atoms/sheet"
import { Menu, LayoutDashboard, LogOut, UserRound, Rocket } from "lucide-react"
import SignInCtaButton from "@/components/molecules/SignInCtaButton"
import NotificationBell from "@/components/molecules/NotificationBell"
import clsx from "clsx"
import { SignOutButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs"
import { BrandWordmark } from "@/components/molecules/BrandWordmark"
import SignInButton from "@/components/molecules/SignInButton"
import {
  ANALYTICS_PATH,
  BROWSE_PATH,
  LEADERBOARD_PATH,
  MEMBER_BASE_PATH,
  MEMBER_ACCOUNT_PROFILE_PATH,
  MEMBER_NOTIFICATIONS_PATH,
  MEMBER_PRODUCTS_PATH,
  PRICING_PATH,
  REWARDS_PATH,
} from "@/lib/routes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import { useRouter } from "next/navigation"

const navLinks = [
  { label: "Browse", href: BROWSE_PATH },
  { label: "Leaderboard", href: LEADERBOARD_PATH },
  { label: "Analytics", href: ANALYTICS_PATH },
  { label: "Pricing", href: PRICING_PATH },
  { label: "Rewards", href: REWARDS_PATH },
]

export default function PublicHeader() {
  const pathname = usePathname() ?? "/"
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { user } = useUser()

  const userInitials = (() => {
    const nameInitials = user?.fullName
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase() ?? "")
      .join("")
    if (nameInitials && nameInitials.length > 0) {
      return nameInitials
    }
    const emailInitials = user?.emailAddresses?.[0]?.emailAddress?.slice(0, 2)
    if (emailInitials && emailInitials.length > 0) {
      return emailInitials.toUpperCase()
    }
    return "SY"
  })()

  const isActive = (href: string) => pathname === href

  const searchParamsString = searchParams?.toString() ?? ""
  const currentLocation = searchParamsString
    ? `${pathname}?${searchParamsString}`
    : pathname
  const navbarAuthSearch = new URLSearchParams({
    redirectTo: currentLocation,
    source: "navbar",
  }).toString()
  const navbarAuthRedirectUrl = `${MEMBER_BASE_PATH}?${navbarAuthSearch}`

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-white shadow-[0_18px_48px_-26px_rgba(17,24,39,0.35)]">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center gap-3 sm:gap-4">
          <BrandWordmark preload />

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2",
                  isActive(link.href)
                    ? "font-semibold text-black"
                    : "text-black/70 hover:text-black",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link
            href={MEMBER_PRODUCTS_PATH}
            className="hidden items-center gap-2 rounded-full border border-dashed border-border/70 bg-white px-4 py-2 text-sm font-semibold text-[color:var(--brand-1)] shadow-sm transition hover:border-border hover:bg-white/90 lg:inline-flex"
          >
            <Rocket className="h-4 w-4" aria-hidden="true" />
            Submit product
          </Link>
          <SignedOut>
            <div className="flex items-center gap-2">
              <SignInButton
                mode="modal"
                forceRedirectUrl={navbarAuthRedirectUrl}
                signUpForceRedirectUrl={navbarAuthRedirectUrl}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-4 text-sm font-semibold"
                >
                  Log in
                </Button>
              </SignInButton>
              <SignInButton
                mode="modal"
                forceRedirectUrl={navbarAuthRedirectUrl}
                signUpForceRedirectUrl={navbarAuthRedirectUrl}
              >
                <SignInCtaButton
                  size="sm"
                  className="px-4 text-sm font-semibold"
                  label="Sign up"
                />
              </SignInButton>
            </div>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center gap-2">
              <NotificationBell />
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-[30px] w-[30px] rounded-full border border-border/70 bg-white/80 p-0 shadow-sm transition hover:border-border"
                      style={{ width: 30, height: 30 }}
                      aria-label="Open account menu"
                    >
                      <Avatar className="h-full w-full">
                        <AvatarImage
                          src={user.imageUrl ?? ""}
                          alt={user.fullName ?? "Account avatar"}
                          width={30}
                          height={30}
                        />
                        <AvatarFallback className="bg-muted text-xs font-semibold uppercase text-muted-foreground">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={10}
                    className="w-52 rounded-xl border border-border/70 bg-white/95 shadow-lg"
                  >
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={(event) => {
                        event.preventDefault()
                        router.push(MEMBER_BASE_PATH)
                      }}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={(event) => {
                        event.preventDefault()
                        router.push(MEMBER_ACCOUNT_PROFILE_PATH)
                      }}
                    >
                      <UserRound className="h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <SignOutButton>
                      <DropdownMenuItem
                        variant="destructive"
                        className="cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </SignOutButton>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </SignedIn>
        </div>

        <div className="flex items-center md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation"
                className="rounded-full border border-border/70 bg-white/80 text-muted-foreground shadow-sm"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-80 border-l border-border/60 bg-white/90 p-6 backdrop-blur supports-[backdrop-filter]:bg-white/80"
            >
              <div className="flex flex-col gap-6">
                <BrandWordmark
                  compact
                  onClick={() => setOpen(false)}
                />
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Navigation
                  </div>
                  <div className="flex flex-col gap-2">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={clsx(
                          "rounded-xl border border-border/60 px-4 py-2 text-sm font-medium transition-colors",
                          isActive(link.href)
                            ? "font-semibold text-black"
                            : "bg-white/80 text-black/70 hover:bg-black/[0.04] hover:text-black",
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 border-t border-border/60 pt-5">
                  <span className="block pb-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Launch with us
                  </span>
                  <Link
                    href={MEMBER_PRODUCTS_PATH}
                    onClick={() => setOpen(false)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-border/80 bg-white/80 px-4 py-2 text-sm font-semibold text-[color:var(--brand-1)]"
                  >
                    <Rocket className="h-4 w-4" aria-hidden="true" />
                    Submit product
                  </Link>
                  <SignedOut>
                    <SignInButton
                      mode="modal"
                      forceRedirectUrl={navbarAuthRedirectUrl}
                      signUpForceRedirectUrl={navbarAuthRedirectUrl}
                    >
                      <SignInCtaButton className="w-full rounded-full" />
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <div className="flex flex-col gap-2">
                      <Link
                        href={MEMBER_NOTIFICATIONS_PATH}
                        onClick={() => setOpen(false)}
                        className="inline-flex w-full items-center justify-between rounded-xl border border-border/60 bg-white/80 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/60"
                      >
                        Notifications
                      </Link>
                      <Link
                        href={MEMBER_BASE_PATH}
                        onClick={() => setOpen(false)}
                        className="inline-flex w-full items-center justify-between rounded-xl border border-border/60 bg-white/80 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/60"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href={MEMBER_ACCOUNT_PROFILE_PATH}
                        onClick={() => setOpen(false)}
                        className="inline-flex w-full items-center justify-between rounded-xl border border-border/60 bg-white/80 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/60"
                      >
                        Profile
                      </Link>
                      <SignOutButton>
                        <button
                          type="button"
                          onClick={() => setOpen(false)}
                          className="inline-flex w-full items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/15"
                        >
                          Sign out
                        </button>
                      </SignOutButton>
                    </div>
                  </SignedIn>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
