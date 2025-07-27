"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/atoms/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/atoms/sheet"
import { Menu } from "lucide-react"
import clsx from "clsx"

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
    <header className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold tracking-tight">
          ShipYardHQ
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "text-sm font-medium hover:text-primary transition-colors",
                pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/member/products/add">
            <Button variant="outline" size="sm">
              Submit Product
            </Button>
          </Link>
          <Link href={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}>
            <Button size="sm">Sign In</Button>
          </Link>
        </div>

        {/* Mobile Nav Trigger */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-6">
              <div className="space-y-4">
                <div className="text-lg font-semibold">Navigation</div>
                <div className="flex flex-col space-y-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={clsx(
                        "text-sm font-medium hover:text-primary",
                        pathname === link.href
                          ? "text-primary"
                          : "text-muted-foreground",
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
                    <Button variant="outline" className="w-full">
                      Submit Product
                    </Button>
                  </Link>
                  <Link
                    href={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
                    onClick={() => setOpen(false)}
                  >
                    <Button className="w-full">Sign In</Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
