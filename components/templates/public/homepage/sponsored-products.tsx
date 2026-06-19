import Link from "next/link"
import { Sparkles } from "lucide-react"

import { Image } from "@/components/atoms/image"
import { getPartnerSpotlightProducts } from "@/actions/public/products/featured"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { SponsorPromo } from "@/components/molecules/SponsorPromo"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { isOptimizedImageSrc } from "@/lib/images/sources"

const SPONSOR_SLOT_COUNT = 3

const SPONSORED_SECTION_GLOW_CLASS =
  "border-amber-200/80 ring-1 ring-amber-200/40 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_26px_80px_-60px_rgba(245,158,11,0.75)]"

type SponsorProduct = Awaited<
  ReturnType<typeof getPartnerSpotlightProducts>
>[number]

type SponsorListItem = {
  id: string
  name: string
  tagline: string
  logo: string | null
  slug: string
}

function mapProductsToSponsors(products: SponsorProduct[]): SponsorListItem[] {
  const seen = new Set<string>()
  const sponsors: SponsorListItem[] = []

  for (const product of products) {
    if (seen.has(product.id)) continue

    seen.add(product.id)
    sponsors.push({
      id: product.id,
      name: product.name,
      tagline:
        product.tagline ??
        "Launch with Shipyard and reach thousands of early adopters.",
      logo: product.logo,
      slug: product.slug,
    })

    if (sponsors.length >= SPONSOR_SLOT_COUNT) {
      break
    }
  }

  return sponsors
}

function SponsorCard({ item }: { item: SponsorListItem }) {
  const logoSrc = isOptimizedImageSrc(item.logo) ? item.logo : null
  const displayTagline = item.tagline?.trim()
  const logoFallback = item.name.slice(0, 1).toUpperCase()

  const content = (
    <article className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-border/80 group-hover:shadow-md">
      <div className="relative w-full aspect-[16/6] border-b border-border/50 bg-muted/40">
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt={`${item.name} logo`}
            fill
            sizes="(min-width: 1024px) 220px, 100vw"
            className="object-contain p-3"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#A33105]">
            {logoFallback}
          </div>
        )}
      </div>

      <div className="space-y-1 px-3 py-2.5">
        <p className="line-clamp-1 text-base font-semibold leading-[1.25] tracking-tight text-foreground underline-offset-4 decoration-foreground/25 group-hover:underline">
          {item.name}
        </p>
        {displayTagline ? (
          <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground lg:line-clamp-1">
            {displayTagline}
          </p>
        ) : null}
      </div>
    </article>
  )

  return (
    <Link
      href={`/r/sponsored/${item.slug}`}
      prefetch={false}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      aria-label={`${item.name} (sponsored listing)`}
    >
      {content}
    </Link>
  )
}

const getCachedSponsorItems = cached(
  async () => {
    const products = await getPartnerSpotlightProducts(SPONSOR_SLOT_COUNT)
    return mapProductsToSponsors(products)
  },
  "partner-spotlight:homepage-section:v1",
  {
    ttl: DEFAULT_TTL.medium,
    tags: () => [
      TAGS.products,
      TAGS.placement("partnerSpotlight"),
      TAGS.planFeature("partnerSpotlight"),
      TAGS.plans,
    ],
  },
)

export async function SponsoredProductsSection() {
  const sponsors = await getCachedSponsorItems()

  if (!sponsors.length) return null

  return (
    <section
      className={`rounded-xl border bg-white p-5 ${SPONSORED_SECTION_GLOW_CLASS}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-amber-500">
          <Sparkles
            className="h-4 w-4"
            aria-hidden="true"
            fill="currentColor"
            strokeWidth={1.75}
          />
        </span>
        <h2 className="text-base font-semibold text-foreground">Sponsors</h2>
      </div>

      <div className="mt-5 space-y-3">
        {sponsors.map((item) => (
          <SponsorCard key={item.id} item={item} />
        ))}
      </div>

      <SponsorPromo className="mt-5" />
    </section>
  )
}

export function SponsoredProductsSkeleton() {
  return (
    <Skeleton
      tone="soft"
      radius="lg"
      shimmer={false}
      className={`rounded-xl border bg-white p-5 ${SPONSORED_SECTION_GLOW_CLASS}`}
    >
      <HeadingSkeleton className="w-28" lines={1} />
      <div className="mt-5 space-y-3">
        {Array.from({ length: SPONSOR_SLOT_COUNT }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border/40 bg-white"
          >
            <Skeleton
              tone="neutral"
              radius="none"
              className="w-full aspect-[16/6]"
            />
            <div className="space-y-2 px-3 py-2.5">
              <Skeleton
                tone="neutral"
                radius="none"
                className="h-3 w-2/3 rounded-full"
              />
              <Skeleton
                tone="neutral"
                radius="none"
                className="h-3 w-full rounded-full"
              />
            </div>
          </div>
        ))}
      </div>
      <Skeleton tone="neutral" radius="none" className="mt-5 h-4 w-44" />
    </Skeleton>
  )
}
