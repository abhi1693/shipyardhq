import PublicContainer from "@/components/layout/PublicContainer"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import ProductList from "@/components/molecules/ProductList"
import { getWaveBackground } from "@/lib/nautical"

type ProductItem = {
  id: string
  slug: string
  name: string
  logo: string
  tagline: string
  ProductBadge?: { badge: string; expiresAt?: Date | string | null }[]
  analytics?: { upvotes?: number | null } | null
  user?: { firstName?: string | null; lastName?: string | null } | null
  category?: { name?: string | null } | null
}

export default function HomepageSpotlight({
  products,
}: {
  products: ProductItem[]
}) {
  if (!products || products.length === 0) return null
  return (
    <PublicContainer
      as="section"
      max="marketing"
      paddingY="py-20"
      className="relative overflow-hidden border-b bg-background/85 shadow-[0px_35px_90px_-60px_rgba(7,58,104,0.85)] backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-2)/0.3] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          backgroundImage:
            "radial-gradient(120%_90%_at_10%_10%, rgba(7, 58, 104, 0.22), transparent 70%), radial-gradient(95%_80%_at_85%_20%, rgba(20, 90, 140, 0.18), transparent 75%)",
          maskImage:
            "radial-gradient(85%_100%_at_50%_5%, rgba(0, 0, 0, 0.92), transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-30"
        style={{
          ...getWaveBackground("240px 90px"),
          backgroundPosition: "0 50%",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-20%] bottom-[-40px] -z-40 h-48 rounded-[50%] bg-[radial-gradient(70%_100%_at_50%_0%,var(--brand-2)/0.22,transparent_82%)] blur-3xl"
      />

      <div className="relative space-y-10">
        <PageSectionHeader
          eyebrow="Harbor Picks"
          align="center"
          title="Harbor Spotlight"
          subtitle="Flagship picks charted to greet every newcomer at the dock."
        />
        <ProductList
          items={products.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            logo: p.logo,
            tagline: p.tagline,
            analytics: p.analytics ?? null,
            user: p.user ?? undefined,
            category: p.category ?? undefined,
            badges: (p.ProductBadge || [])
              .filter((b) => !b.expiresAt || new Date(b.expiresAt) > new Date())
              .map((b) => b.badge),
          }))}
          showCategory
        />
      </div>
    </PublicContainer>
  )
}
