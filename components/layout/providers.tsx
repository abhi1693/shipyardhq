"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "next-themes"
import React from "react"
import { NewsletterBeacon } from "@/components/organisms/NewsletterBeacon"

export default function Providers({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  return (
    <ClerkProvider
      appearance={{
        baseTheme: theme === "dark" ? dark : undefined,
      }}
    >
      {children}
      <NewsletterBeacon />
    </ClerkProvider>
  )
}
