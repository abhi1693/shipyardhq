"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/atoms/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/atoms/sheet"
import { Menu, LayoutDashboard, LogOut, UserRound, Rocket } from "lucide-react"
import SignInCtaButton from "@/components/molecules/SignInCtaButton"
import NovuInbox from "@/components/molecules/NovuInbox"
import clsx from "clsx"
import { Show, SignOutButton, useUser } from "@clerk/nextjs"
import { BrandWordmark } from "@/components/molecules/BrandWordmark"
import SignInButton from "@/components/molecules/SignInButton"
import { getCurrentUserRewardBalanceAction } from "@/actions/member/rewards/get-reward-balance"
import {
  ANALYTICS_PATH,
  BROWSE_PATH,
  LEADERBOARD_PATH,
  MEMBER_BASE_PATH,
  MEMBER_ACCOUNT_PROFILE_PATH,
  MEMBER_REWARDS_PATH,
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
import { RewardMenuItemContent } from "@/components/molecules/RewardMenuItemContent"
import {
  AUTH_DISABLED_MESSAGE,
  AUTH_DISABLED_SHORT_LABEL,
  AUTH_TEMPORARILY_DISABLED,
} from "@/lib/auth/availability"

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
  const [rewardBalance, setRewardBalance] = useState<number | null>(null)

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

  const userId = user?.id ?? null

  useEffect(() => {
    if (!userId) return undefined

    let isCurrent = true
    async function loadBalance() {
      try {
        const balance = await getCurrentUserRewardBalanceAction()
        if (!isCurrent) return
        setRewardBalance(balance)
      } catch {
        if (isCurrent) {
          setRewardBalance(null)
        }
      }
    }

    loadBalance()

    return () => {
      isCurrent = false
    }
  }, [userId])

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-white shadow-[0_18px_48px_-26px_rgba(17,24,39,0.35)]">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center gap-3 sm:gap-4">
          <BrandWordmark eager />

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
          <Show when="signed-out">
            {AUTH_TEMPORARILY_DISABLED ? (
              <span
                title={AUTH_DISABLED_MESSAGE}
                className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-500"
              >
                {AUTH_DISABLED_SHORT_LABEL}
              </span>
            ) : (
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
            )}
          </Show>
          <Show when="signed-in">
            <div className="flex items-center gap-2">
              <NovuInbox />
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
                      className="cursor-pointer items-start"
                      onSelect={(event) => {
                        event.preventDefault()
                        router.push(MEMBER_REWARDS_PATH)
                      }}
                    >
                      <RewardMenuItemContent balance={rewardBalance ?? 0} />
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
          </Show>
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
                <BrandWordmark compact onClick={() => setOpen(false)} />
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
                  <Show when="signed-out">
                    <div
                      title={AUTH_DISABLED_MESSAGE}
                      className={clsx(
                        "inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500",
                        !AUTH_TEMPORARILY_DISABLED && "hidden",
                      )}
                    >
                      {AUTH_DISABLED_SHORT_LABEL}
                    </div>
                    {!AUTH_TEMPORARILY_DISABLED ? (
                      <SignInButton
                        mode="modal"
                        forceRedirectUrl={navbarAuthRedirectUrl}
                        signUpForceRedirectUrl={navbarAuthRedirectUrl}
                      >
                        <SignInCtaButton className="w-full rounded-full" />
                      </SignInButton>
                    ) : null}
                  </Show>
                  <Show when="signed-in">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={MEMBER_REWARDS_PATH}
                        onClick={() => setOpen(false)}
                        className="inline-flex w-full items-center rounded-xl border border-border/60 bg-white/80 px-4 py-2 text-left text-sm font-semibold text-foreground transition hover:bg-muted/60"
                      >
                        <RewardMenuItemContent balance={rewardBalance ?? 0} />
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
                  </Show>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
