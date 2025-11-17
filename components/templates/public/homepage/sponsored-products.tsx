import Link from "next/link"
import { Sparkles } from "lucide-react"

import { Image } from "@/components/atoms/image"
import { SquareImage } from "@/components/molecules/SquareImage"
import { getSponsoredProducts } from "@/actions/public/products/featured"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { SponsorPromo } from "@/components/molecules/SponsorPromo"
import { ProductClickLink } from "@/components/molecules/ProductClickLink"
import { PRICING_PATH } from "@/lib/routes"
import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"

const SPONSOR_SLOT_COUNT = 3

type SponsorPlacement = Awaited<ReturnType<typeof getSponsoredProducts>>[number]

type SponsorListItem =
  | {
      id: string
      name: string
      tagline: string
      logo: string | null
      slug: string
      isPlaceholder?: false
    }
  | {
      id: string
      name: string
      tagline: string
      isPlaceholder: true
    }

const PLACEHOLDER_CONTENT: Omit<SponsorListItem, "id">[] = [
  {
    name: "Spotlight your launch",
    tagline:
      "Drive consistent discovery with a dedicated placement seen by builders daily.",
    isPlaceholder: true,
  },
  {
    name: "Reserve a premium slot",
    tagline:
      "Keep your product front-and-center next to Shipyard’s trending products.",
    isPlaceholder: true,
  },
  {
    name: "Tell your story here",
    tagline:
      "Sponsor the community that helps founders learn, launch, and grow faster.",
    isPlaceholder: true,
  },
]

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

function SponsorAvatar({
  name,
  logo,
  placeholder,
}: {
  name: string
  logo?: string | null
  placeholder?: boolean
}) {
  if (placeholder) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 text-muted-foreground">
        <Sparkles
          className="h-4 w-4 text-amber-500"
          aria-hidden="true"
          fill="currentColor"
          strokeWidth={1.75}
        />
      </span>
    )
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted/40">
      {logo ? (
        <SquareImage
          src={logo}
          alt={name}
          size={48}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-sm font-semibold text-primary">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  )
}

function SponsorCard({ item }: { item: SponsorListItem }) {
  const content = (
    <div className="flex items-start gap-3">
      <SponsorAvatar
        name={item.name}
        logo={!item.isPlaceholder ? item.logo : undefined}
        placeholder={item.isPlaceholder}
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-semibold text-foreground">
          {item.name}
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {item.tagline}
        </p>
      </div>
    </div>
  )

  if (item.isPlaceholder) {
    return (
      <Link
        href={PRICING_PATH}
        className="group block w-full px-2 py-4 text-sm transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        {content}
      </Link>
    )
  }

  return (
    <ProductClickLink
      productId={item.id}
      productSlug={item.slug}
      prefetch={false}
      className="group block w-full px-2 py-4 text-sm transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      formClassName="w-full"
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
    <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-amber-500">
          <Sparkles
            className="h-4 w-4"
            aria-hidden="true"
            fill="currentColor"
            strokeWidth={1.75}
          />
        </span>
        <h2 className="text-lg font-semibold text-foreground">Sponsors</h2>
      </div>

      <div className="mt-6 divide-y divide-border/50">
        {sponsors.map((item) => (
          <SponsorCard key={item.id} item={item} />
        ))}
      </div>

      <SponsorPromo className="mt-6" />
    </section>
  )
}

export function SponsoredProductsSkeleton() {
  return (
    <Skeleton
      tone="soft"
      radius="lg"
      shimmer={false}
      className="rounded-xl border border-border bg-white p-6 shadow-sm"
    >
      <HeadingSkeleton className="w-32" lines={1} />
      <div className="mt-6 divide-y divide-border/50">
        {Array.from({ length: SPONSOR_SLOT_COUNT }).map((_, index) => (
          <div key={index} className="px-2 py-4">
            <Skeleton
              tone="neutral"
              radius="none"
              className="h-16 w-full border border-border/40"
            />
          </div>
        ))}
      </div>
      <Skeleton tone="neutral" radius="none" className="mt-6 h-4 w-48" />
    </Skeleton>
  )
}
