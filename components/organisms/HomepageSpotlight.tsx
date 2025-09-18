import PublicContainer from "@/components/layout/PublicContainer"
import { PageSectionHeader } from "@/components/molecules/PageSectionHeader"
import ProductList from "@/components/molecules/ProductList"

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
      className="relative overflow-hidden border-b bg-background/80 backdrop-blur"
      innerClassName="relative"
      fillScreen={false}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-2)/0.3] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-20 h-72 w-[120%] -translate-x-1/2 bg-[radial-gradient(70%_100%_at_50%_0%,var(--brand-2)/0.16,transparent_72%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
        }}
      />

      <div className="relative space-y-10">
        <PageSectionHeader
          align="center"
          title="Homepage Picks"
          subtitle="Flagship picks anchored on our homepage"
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
          compact={false}
          showCategory
          columns="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
        />
      </div>
    </PublicContainer>
  )
}
