import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import {
  TaxonomyIndexPage,
  type TaxonomyIndexItem,
} from "@/components/templates/public/common/TaxonomyIndexPage"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { getAlternativesPagePayload } from "@/lib/alternatives/page-cache"
import { buildPageMetadata } from "@/lib/metadata"
import { ALTERNATIVES_PATH, HOME_PATH, alternativePath } from "@/lib/routes"
import { BRAND_NAME } from "@/lib/brand"

export const revalidate = 300

const PAGE_TITLE = "Browse SaaS Alternatives"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: `Explore SaaS and app alternatives in the ${BRAND_NAME} launch directory, compare products, and discover tools founders are building now.`,
  canonical: ALTERNATIVES_PATH,
})

export default async function AlternativesPage() {
  const {
    alternatives,
    highlightAlternatives,
    momentumByAlternativeId = {},
    alternativeCount,
    totalProducts,
    averagePerAlternative,
    busiestAlternative,
  } = await getAlternativesPagePayload()

  const items: TaxonomyIndexItem[] = alternatives.map((alternative, index) => ({
    key: alternative.id,
    title: alternative.name,
    description: alternative.description,
    href: alternativePath(alternative.slug),
    count: alternative._count.products,
    icon: (
      <AlternativeIcon name={alternative.name} logoUrl={alternative.logoUrl} />
    ),
    momentum: momentumByAlternativeId[alternative.id] ?? 0,
    tone: index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "orange",
  }))

  const itemById = new Map(items.map((item) => [item.key, item] as const))
  const trendingItems = highlightAlternatives
    .map((alternative) => itemById.get(alternative.id))
    .filter((item): item is TaxonomyIndexItem => Boolean(item))

  return (
    <TaxonomyIndexPage
      title="Discover alternatives for every launch stack"
      description="Browse the SaaS tools founders compare, replace, and benchmark while mapping the right products for their next launch."
      searchPlaceholder={`Search ${alternativeCount.toLocaleString()} alternatives...`}
      itemsHeading="All Alternatives"
      items={items}
      totalItems={alternativeCount}
      trendingItems={trendingItems}
      directoryAccessory="icon"
      pulseTitle="Alternatives Pulse"
      pulseStats={[
        {
          label: "Active alternatives",
          value: alternativeCount.toLocaleString(),
        },
        { label: "Mapped products", value: totalProducts.toLocaleString() },
        {
          label: "Average per alternative",
          value: averagePerAlternative.toLocaleString(),
        },
        {
          label: "Busiest alternative",
          value: busiestAlternative?.name ?? "No alternatives yet",
        },
      ]}
      quickLinksTitle="Popular Alternatives"
      emptyTitle="No alternatives yet"
      emptyDescription="Once products are mapped as alternatives, this directory will populate automatically."
      structuredData={
        <CoreStructuredData
          scriptKeyPrefix="alternatives"
          webPage={{ path: ALTERNATIVES_PATH, name: PAGE_TITLE }}
          breadcrumbs={{
            items: [
              { name: "Home", path: HOME_PATH },
              { name: PAGE_TITLE, path: ALTERNATIVES_PATH },
            ],
          }}
        />
      }
    />
  )
}

function AlternativeIcon({
  name,
  logoUrl,
}: {
  name: string
  logoUrl?: string | null
}) {
  return (
    <Avatar className="h-7 w-7 rounded-md bg-white">
      {logoUrl ? <AvatarImage src={logoUrl} alt={`${name} logo`} /> : null}
      <AvatarFallback className="rounded-md text-[10px] font-semibold uppercase text-[#43474c]">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

function getInitials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2)

  return letters || "ALT"
}
