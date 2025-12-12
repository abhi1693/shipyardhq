import Link from "next/link"
import { Sparkles } from "lucide-react"

import { Image } from "@/components/atoms/image"
import { getSponsoredProducts } from "@/actions/public/products/featured"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { SponsorPromo } from "@/components/molecules/SponsorPromo"
import { ProductClickLink } from "@/components/molecules/ProductClickLink"
import { PRICING_PATH } from "@/lib/routes"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"

const SPONSOR_SLOT_COUNT = 3

const SPONSORED_SECTION_GLOW_CLASS =
  "border-amber-200/80 ring-1 ring-amber-200/40 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_26px_80px_-60px_rgba(245,158,11,0.75)]"

type SponsorPlacement = Awaited<ReturnType<typeof getSponsoredProducts>>[number]

type SponsorListItem =
  | {
      id: string
      name: string
      tagline: string
      logo: string | null
      bannerImage: string | null
      slug: string
      isPlaceholder?: false
    }
  | {
      id: string
      name: string
      tagline: string
      isPlaceholder: true
    }

const PLACEHOLDER_CONTENT: Omit<SponsorListItem, "id">[] = Array.from(
  { length: SPONSOR_SLOT_COUNT },
  () => ({
    name: "Advertise here",
    tagline: "Get your product in front of builders.",
    isPlaceholder: true,
  }),
)

function mapPlacementsToSponsors(
  placements: SponsorPlacement[],
): SponsorListItem[] {
  const seen = new Set<string>()
  const sponsors: SponsorListItem[] = []

  for (const placement of placements) {
    const product = placement.product
    if (!product) continue
    if (seen.has(product.id)) continue

    seen.add(product.id)
    sponsors.push({
      id: product.id,
      name: product.name,
      tagline:
        product.tagline ??
        "Launch with Shipyard and reach thousands of early adopters.",
      logo: product.logo,
      bannerImage: product.bannerImage ?? null,
      slug: product.slug,
    })

    if (sponsors.length >= SPONSOR_SLOT_COUNT) {
      break
    }
  }

  return sponsors
}

function withPlaceholders(items: SponsorListItem[]): SponsorListItem[] {
  if (items.length >= SPONSOR_SLOT_COUNT)
    return items.slice(0, SPONSOR_SLOT_COUNT)

  const result = [...items]
  let placeholderIndex = 0

  while (result.length < SPONSOR_SLOT_COUNT) {
    const template =
      PLACEHOLDER_CONTENT[placeholderIndex % PLACEHOLDER_CONTENT.length]
    result.push({
      ...template,
      id: `placeholder-${placeholderIndex}`,
      isPlaceholder: true,
    })
    placeholderIndex += 1
  }

  return result
}

function SponsorCard({ item }: { item: SponsorListItem }) {
  const bannerSrc = item.isPlaceholder ? null : item.bannerImage || null
  const logoFallbackSrc = item.isPlaceholder ? null : item.logo || null

  const content = (
    <article className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm transition-all duration-150 group-hover:border-border/80 group-hover:shadow-md">
      <div className="relative h-[72px] w-full border-b border-border/50 bg-muted/40">
        {item.isPlaceholder ? (
          <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-muted-foreground/20 text-muted-foreground">
            <Sparkles
              className="h-4 w-4 text-amber-500"
              aria-hidden="true"
              fill="currentColor"
              strokeWidth={1.75}
            />
          </div>
        ) : bannerSrc ? (
          <>
            <Image
              src={bannerSrc}
              alt={`${item.name} banner`}
              fill
              sizes="(min-width: 1024px) 220px, 100vw"
              className="object-cover transition-transform duration-200 will-change-transform group-hover:scale-[1.03]"
            />
          </>
        ) : logoFallbackSrc ? (
          <Image
            src={logoFallbackSrc}
            alt={`${item.name} logo`}
            fill
            sizes="(min-width: 1024px) 220px, 100vw"
            className="object-contain p-3"
          />
        ) : null}
      </div>

      <div className="space-y-1 px-3 py-2.5">
        <p className="line-clamp-1 text-base font-semibold leading-snug tracking-tight text-foreground underline-offset-4 decoration-foreground/25 group-hover:underline">
          {item.name}
        </p>
        {item.tagline ? (
          <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">
            {item.tagline}
          </p>
        ) : null}
      </div>
    </article>
  )

  if (item.isPlaceholder) {
    return (
      <Link
        href={PRICING_PATH}
        className="group block w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        aria-label="Advertise here (sponsored listing)"
      >
        {content}
      </Link>
    )
  }

  return (
    <ProductClickLink
      productSlug={item.slug}
      prefetch={false}
      className="group block w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      formClassName="w-full"
      aria-label={`${item.name} (sponsored listing)`}
    >
      {content}
    </ProductClickLink>
  )
}

const getCachedSponsorItems = cached(
  async () => {
    const placements = await getSponsoredProducts(1000)
    return withPlaceholders(mapPlacementsToSponsors(placements))
  },
  "sponsored-products:section",
  {
    ttl: DEFAULT_TTL.medium,
    tags: () => [TAGS.products, TAGS.placement("sponsoredProducts")],
  },
)

export async function SponsoredProductsSection() {
  const sponsors = await getCachedSponsorItems()

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
          <Skeleton
            key={index}
            tone="neutral"
            radius="none"
            className="h-28 w-full rounded-xl border border-border/40"
          />
        ))}
      </div>
      <Skeleton tone="neutral" radius="none" className="mt-5 h-4 w-44" />
    </Skeleton>
  )
}
