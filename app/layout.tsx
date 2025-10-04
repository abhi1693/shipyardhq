import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/atoms/sonner"
import { GoogleAnalytics } from "@next/third-parties/google"
import Providers from "@/components/layout/providers"
import { ClarityAnalytics } from "@/components/layout/ClarityAnalytics"
import "./globals.css"
import { HAS_APP_URL, IS_PROD } from "@/lib/constants"
import "./theme.css"
import { buildSiteSeo, siteConfig } from "@/lib/siteConfig"

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

const siteSeo = buildSiteSeo()

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteSeo.defaultTitle,
    template: siteSeo.titleTemplate,
  },
  description: siteSeo.description,
  icons: {
    icon: siteConfig.ogImage,
    shortcut: siteConfig.ogImage,
    apple: siteConfig.ogImage,
  },
  openGraph: siteSeo.openGraph,
  twitter: siteSeo.twitter,
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
      </head>
      <body className="min-h-screen antialiased bg-[var(--background)] text-[var(--foreground)]">
        <ClarityAnalytics />
        <Providers>
          <Toaster position="top-right" />
          {children}
        </Providers>
      </body>
      {IS_PROD && HAS_APP_URL && process.env.GOOGLE_ANALYTICS_ID && (
        <GoogleAnalytics gaId={process.env.GOOGLE_ANALYTICS_ID} />
      )}
    </html>
  )
}
