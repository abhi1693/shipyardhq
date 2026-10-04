import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Suspense } from "react"
import { AdDocumentBoundary } from "@/components/molecules/AdDocumentBoundary"
import { DeferredGoogleAnalytics } from "@/components/analytics/DeferredGoogleAnalytics"
import { LazyToaster } from "@/components/atoms/lazy-toaster"
import "./globals.css"
import { IS_PROD } from "@/lib/constants"
import { resolveExcludedGaHostnames } from "@/lib/analytics/gaHostnames"
import { buildSiteSeo, siteConfig } from "@/lib/siteConfig"
import { FaroRum } from "./faro-rum"

const siteSeo = buildSiteSeo()

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteSeo.defaultTitle,
    template: siteSeo.titleTemplate,
  },
  description: siteSeo.description,
  keywords: siteSeo.keywords,
  applicationName: siteConfig.name,
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "technology",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: siteConfig.icon },
      { url: "/brand-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: siteConfig.icon,
    apple: { url: "/brand-180.png", sizes: "180x180", type: "image/png" },
  },
  openGraph: siteSeo.openGraph,
  twitter: siteSeo.twitter,
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
}

function buildGaHostnameGuardScript(gaId: string) {
  const disabledKey = `ga-disable-${gaId}`
  const excludedHostnames = resolveExcludedGaHostnames()

  return `(() => {
  const hostname = window.location.hostname.toLowerCase().replace(/^\\[|\\]$/g, "");
  if (${JSON.stringify(excludedHostnames)}.includes(hostname)) {
    window[${JSON.stringify(disabledKey)}] = true;
  }
})();`
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const gaId = IS_PROD ? process.env.GOOGLE_ANALYTICS_ID?.trim() : null

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {gaId && (
          <Script
            id="ga-hostname-exclusions"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: buildGaHostnameGuardScript(gaId),
            }}
          />
        )}
      </head>
      <body className="min-h-screen antialiased bg-[var(--background)] text-[var(--foreground)]">
        <Suspense fallback={null}>
          <AdDocumentBoundary />
        </Suspense>
        <FaroRum />
        <LazyToaster position="top-right" />
        {children}
        {gaId && <DeferredGoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  )
}
