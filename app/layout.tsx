import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/atoms/sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "ShipYard",
  description: "Join our waitlist for the ultimate micro‑SaaS growth toolkit.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body
        className="
          min-h-screen antialiased
          bg-[var(--background)]
          text-[var(--foreground)]
        "
      >
        <ThemeProvider attribute="class" defaultTheme="system">
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
