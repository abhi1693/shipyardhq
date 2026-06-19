"use client"

import { AppClerkProvider } from "@/components/layout/clerk-provider"

import PublicHeaderActions from "./public-header-actions"
import PublicMobileMenu from "./public-mobile-menu"

export default function PublicHeaderAuthControls() {
  return (
    <AppClerkProvider>
      <PublicHeaderActions />
      <PublicMobileMenu />
    </AppClerkProvider>
  )
}
