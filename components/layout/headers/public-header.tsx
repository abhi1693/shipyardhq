"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/atoms/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/atoms/sheet"
import { Menu } from "lucide-react"
import SignOutCtaButton from "@/components/molecules/SignOutCtaButton"
import MemberAreaButton from "@/components/molecules/MemberAreaButton"
import SignInCtaButton from "@/components/molecules/SignInCtaButton"
import clsx from "clsx"
import { SignOutButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"
import { BrandLogo } from "@/components/atoms/brand-logo"

const navLinks = [
  { label: "Browse", href: "/browse" },
  { label: "Categories", href: "/categories" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Analytics", href: "/analytics" },
  { label: "Makers", href: "/users" },
  { label: "Pricing", href: "/pricing" },
]

export default function PublicHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => pathname === href

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--brand-1)/0.12] bg-background/75 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-px w-full bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2"
            aria-label="ShipYardHQ home"
          >
            <BrandLogo
              width={32}
              height={32}
              sizes="(max-width: 768px) 24px, 32px"
              className="h-8 w-8"
              priority
            />
            <span className="text-xl font-semibold tracking-tight text-[color:var(--brand-1)]">
              ShipYardHQ
            </span>
          </Link>

          <nav className="hidden lg:flex flex-1 items-center justify-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "text-foreground after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-5 after:-translate-x-1/2 after:rounded-full after:bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3 ml-auto">
            <Link
              href="/member/products/add"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.25] px-3 py-1.5 text-sm font-semibold text-[color:var(--brand-1)] transition hover:border-[color:var(--brand-1)/0.4]"
            >
              Submit Product
            </Link>
            <SignedOut>
              <SignInButton
                mode="modal"
                forceRedirectUrl="/member"
                signUpForceRedirectUrl="/member"
              >
                <SignInCtaButton size="sm" />
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/member">
                <MemberAreaButton variant="outline" size="sm" />
              </Link>
              <SignOutButton>
                <SignOutCtaButton size="sm" />
              </SignOutButton>
            </SignedIn>
          </div>

          <div className="md:hidden ml-auto">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-6">
                <div className="space-y-5">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Navigation
                  </div>
                  <div className="flex flex-col gap-3">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={clsx(
                          "rounded-lg border px-3 py-2 text-sm font-medium transition",
                          isActive(link.href)
                            ? "border-[color:var(--brand-1)/0.4] bg-[color:var(--brand-1)/0.1] text-[color:var(--brand-1)]"
                            : "border-transparent bg-muted/40 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  <div className="border-t pt-5 space-y-3">
                    <Link
                      href="/member/products/add"
                      onClick={() => setOpen(false)}
                      className="inline-flex w-full items-center justify-center rounded-full border border-[color:var(--brand-1)/0.3] px-3 py-2 text-sm font-semibold text-[color:var(--brand-1)]"
                    >
                      Submit Product
                    </Link>
                    <SignedOut>
                      <SignInButton
                        mode="modal"
                        forceRedirectUrl="/member"
                        signUpForceRedirectUrl="/member"
                      >
                        <SignInCtaButton className="w-full" />
                      </SignInButton>
                    </SignedOut>
                    <SignedIn>
                      <Link href="/member" onClick={() => setOpen(false)}>
                        <MemberAreaButton
                          variant="outline"
                          className="w-full"
                        />
                      </Link>
                      <SignOutButton>
                        <SignOutCtaButton className="w-full" />
                      </SignOutButton>
                    </SignedIn>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
