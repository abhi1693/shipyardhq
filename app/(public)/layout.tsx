import type { Metadata } from "next"
import PublicHeader from "@/components/layout/headers/public-header"
import PublicFooter from "@/components/layout/footers/public-footer"
import { FaqSection } from "@/components/organisms/FaqSection"
import FeaturedTicker from "@/components/molecules/FeaturedTicker"
import { getStickyBannerProducts } from "@/actions/public/products/featured"
import { getUseCases } from "@/actions/admin/categories/actions"
import { buildSiteSeo } from "@/lib/siteConfig"

const siteSeo = buildSiteSeo()

export const metadata: Metadata = {
  title: {
    default: siteSeo.defaultTitle,
    template: siteSeo.titleTemplate,
  },
  description: siteSeo.description,
  openGraph: siteSeo.openGraph,
  twitter: siteSeo.twitter,
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [tickerItems, useCases] = await Promise.all([
    getStickyBannerProducts(12),
    getUseCases({
      select: { label: true, slug: true },
      orderBy: { label: "asc" },
      take: 6,
    }),
  ])
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      {tickerItems.length > 0 && <FeaturedTicker items={tickerItems} />}
      <main className="flex-1">{children}</main>
      <FaqSection />
      <PublicFooter useCases={useCases} />
    </div>
  )
}
