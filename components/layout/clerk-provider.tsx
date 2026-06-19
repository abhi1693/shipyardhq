"use client"

import { ClerkProvider } from "@clerk/nextjs"
import type { ReactNode } from "react"

const clerkAppearance = {
  variables: {
    colorPrimary: "#0051d5",
    colorBackground: "#ffffff",
    colorText: "#0b1c30",
    colorTextSecondary: "#43474c",
    colorNeutral: "#74777d",
    borderRadius: "0.5rem",
    fontFamily: "Inter, var(--font-sans), sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox:
      "rounded-xl border border-[#E2E8F0] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]",
    card: "rounded-xl bg-white shadow-none",
    headerTitle: "text-[#0b1c30] text-[18px] font-semibold tracking-normal",
    headerSubtitle: "text-[#43474c] text-sm leading-5",
    formButtonPrimary:
      "cursor-pointer rounded-lg bg-[#0b1c30] text-white shadow-none transition-all hover:bg-[#213145] active:scale-[0.98]",
    formFieldInput:
      "rounded-lg border-[#E2E8F0] bg-white text-[#0b1c30] shadow-none focus:border-[#0051d5] focus:ring-1 focus:ring-[#0051d5]",
    otpCodeFieldInput:
      "h-12 w-12 rounded-lg border-[#E2E8F0] bg-white text-[#0b1c30] shadow-none focus:border-[#0051d5] focus:ring-1 focus:ring-[#0051d5]",
    footer: "border-t border-[#E2E8F0] bg-[#F8FAFC]",
    footerActionLink: "cursor-pointer text-[#0051d5] hover:text-[#003ea7]",
  },
} as const

export function AppClerkProvider({ children }: { children: ReactNode }) {
  return <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
}
