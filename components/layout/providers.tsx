"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"
import React from "react"
import { NewsletterBeacon } from "@/components/organisms/NewsletterBeacon"

export default function Providers({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const pathname = usePathname()
  const shouldShowNewsletterBeacon = pathname.startsWith("/products/")

  return (
    <ClerkProvider
      appearance={{
        baseTheme: theme === "dark" ? dark : undefined,
      }}
    >
      {children}
      {shouldShowNewsletterBeacon ? <NewsletterBeacon /> : null}
    </ClerkProvider>
  )
}
