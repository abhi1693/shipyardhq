"use client"

import React from "react"
import { AppClerkProvider } from "@/components/layout/clerk-provider"
import { PrivateHeaderSlotProvider } from "@/components/layout/headers/private-header-slot"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppClerkProvider>
      <PrivateHeaderSlotProvider>{children}</PrivateHeaderSlotProvider>
    </AppClerkProvider>
  )
}
