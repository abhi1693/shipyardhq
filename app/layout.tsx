import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/atoms/sonner"
import { GoogleAnalytics } from "@next/third-parties/google"
import Providers from "@/components/layout/providers"
import "./globals.css"
import { HAS_APP_URL, IS_PROD } from "@/lib/constants"
import "./theme.css"
import { buildSiteSeo, siteConfig } from "@/lib/siteConfig"

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
    icon: siteConfig.icon,
    shortcut: siteConfig.icon,
    apple: siteConfig.icon,
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
        <Providers>
          <Toaster position="top-right" />
          {children}
        </Providers>
        {IS_PROD && (
          <Script id="crisp-chatbox" strategy="afterInteractive">{`
           window.$crisp=[];
           window.CRISP_WEBSITE_ID="fe0af523-3d4d-4ce1-9694-5f8cbdab1f80";
           (function(){
             d=document;
             s=d.createElement("script");
             s.src="https://client.crisp.chat/l.js";
             s.async=1;
             d.getElementsByTagName("head")[0].appendChild(s);
           })();
        `}</Script>
        )}
      </body>
      {IS_PROD && HAS_APP_URL && process.env.GOOGLE_ANALYTICS_ID && (
        <GoogleAnalytics gaId={process.env.GOOGLE_ANALYTICS_ID} />
      )}
    </html>
  )
}
