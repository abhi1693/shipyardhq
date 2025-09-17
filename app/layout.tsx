import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/atoms/sonner"
import { GoogleAnalytics } from "@next/third-parties/google"
import NextTopLoader from "nextjs-toploader"
import Providers from "@/components/layout/providers"
import "./globals.css"
import { IS_PROD } from "@/lib/constants"
import "./theme.css"

// Make all routes dynamic to always reflect latest data
export const dynamic = "force-dynamic"
export const revalidate = 0

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const META_THEME_COLORS = {
  light: "#ffffff",
  dark: "#09090b",
}

export const metadata: Metadata = {
  title: "ShipYardHQ",
  description: "Join our waitlist for the ultimate micro‑SaaS growth toolkit.",
  icons: {
    icon: "/brand.png",
    shortcut: "/brand.png",
    apple: "/brand.png",
  },
  metadataBase: new URL(
    (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") as string,
  ),
}

export const viewport: Viewport = {
  themeColor: META_THEME_COLORS.light,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
      </head>
      <body className="min-h-screen antialiased bg-[var(--background)] text-[var(--foreground)]">
        <NextTopLoader showSpinner={false} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <Providers>
            <Toaster position="top-right" />
            {children}
          </Providers>
        </ThemeProvider>
      </body>
      {IS_PROD && <GoogleAnalytics gaId="G-D1Q2TF5RZM" />}
    </html>
  )
}
