"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/atoms/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/atoms/sheet"
import { Menu } from "lucide-react"
import clsx from "clsx"
import { SignInButton, SignOutButton, SignedIn, SignedOut } from "@clerk/nextjs"

const navLinks = [
  { label: "Browse", href: "/browse" },
  { label: "Categories", href: "/categories" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Pricing", href: "/pricing" },
]

export default function PublicHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Left: Logo + Links (desktop) */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2"
            aria-label="ShipYardHQ home"
          >
            <Image
              src="/brand.png"
              alt="ShipYardHQ"
              width={32}
              height={32}
              sizes="(max-width: 768px) 24px, 32px"
              className="h-8 w-8 object-contain"
              priority
            />
            <span className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]">
              ShipYardHQ
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  pathname === link.href &&
                    "text-foreground after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: CTAs (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/member/products/add">
            <Button
              size="sm"
              className="text-white shadow-sm bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] hover:opacity-90"
            >
              Submit Product
            </Button>
          </Link>

          <SignedOut>
            <SignInButton
              mode="modal"
              forceRedirectUrl="/member"
              signUpForceRedirectUrl="/member"
            >
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <Link href="/member">
              <Button variant="outline" size="sm">
                Member Area
              </Button>
            </Link>
            <SignOutButton>
              <Button size="sm">Sign Out</Button>
            </SignOutButton>
          </SignedIn>
        </div>

        {/* Mobile: Logo + Trigger */}
        <div className="md:hidden flex items-center justify-between w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-2"
            aria-label="ShipYardHQ home"
          >
            <Image
              src="/brand.png"
              alt="ShipYardHQ"
              width={24}
              height={24}
              sizes="24px"
              className="h-6 w-6 object-contain"
              priority
            />
            <span className="text-base font-semibold tracking-tight">
              ShipYardHQ
            </span>
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-6">
              <div className="space-y-4">
                <div className="text-lg font-semibold">
                  <span className="text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))]">
                    Navigation
                  </span>
                </div>
                <div className="flex flex-col space-y-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={clsx(
                        "text-sm font-medium text-muted-foreground hover:text-foreground",
                        pathname === link.href && "text-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="pt-6 border-t mt-4 space-y-3">
                  <Link
                    href="/member/products/add"
                    onClick={() => setOpen(false)}
                  >
                    <Button className="w-full text-white bg-[linear-gradient(90deg,var(--brand-1),var(--brand-2),var(--brand-3))] hover:opacity-90">
                      Submit Product
                    </Button>
                  </Link>

                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button className="w-full">Sign In</Button>
                    </SignInButton>
                  </SignedOut>

                  <SignedIn>
                    <Link
                      href="/member"
                      onClick={() => setOpen(false)}
                    >
                      <Button variant="outline" className="w-full">
                        Member Area
                      </Button>
                    </Link>
                    <SignOutButton>
                      <Button className="w-full">Sign Out</Button>
                    </SignOutButton>
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
