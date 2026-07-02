import { JsonLdScript } from "next-seo"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar"
import {
  TaxonomyIndexPage,
  type TaxonomyIndexItem,
} from "@/components/templates/public/common/TaxonomyIndexPage"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { getAlternativesPagePayload } from "@/lib/alternatives/page-cache"
import { buildPageMetadata } from "@/lib/metadata"
import { ALTERNATIVES_PATH, HOME_PATH, alternativePath } from "@/lib/routes"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { BRAND_NAME } from "@/lib/brand"

const PAGE_TITLE = "Browse SaaS Alternatives"
const DIRECTORY_ITEM_LIST_LIMIT = 20

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
  const siteUrl = resolveSiteUrl()
  const pageUrl = `${siteUrl}${ALTERNATIVES_PATH}`
  const itemListId = `${pageUrl}#itemlist`
  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    url: pageUrl,
    name: PAGE_TITLE,
    description: `Explore SaaS and app alternative comparison pages in the ${BRAND_NAME} launch directory.`,
    inLanguage: "en-US",
    numberOfItems: alternativeCount,
    isPartOf: {
      "@type": "WebSite",
      name: BRAND_NAME,
      url: siteUrl,
    },
    mainEntity: { "@id": itemListId },
  }
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": itemListId,
    name: `${BRAND_NAME} alternatives directory`,
    description: `Comparison pages for SaaS alternatives, competitors, and replacement products on ${BRAND_NAME}.`,
    numberOfItems: alternativeCount,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: items
      .slice(0, DIRECTORY_ITEM_LIST_LIMIT)
      .map((item, index) => {
        const itemUrl = `${siteUrl}${item.href}`

        return {
          "@type": "ListItem",
          position: index + 1,
          url: itemUrl,
          item: {
            "@type": "CollectionPage",
            "@id": `${itemUrl}#collection`,
            name: `${item.title} Alternatives`,
            url: itemUrl,
            description: item.description,
          },
        }
      }),
  }

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
        <>
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
          <JsonLdScript
            data={collectionPage}
            scriptKey="alternatives-collection-jsonld"
          />
          <JsonLdScript
            data={itemList}
            scriptKey="alternatives-itemlist-jsonld"
          />
        </>
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
