import { Hash } from "lucide-react"
import { JsonLdScript } from "next-seo"

import { formatTagLabel } from "@/app/(public)/tags/_utils"
import {
  TaxonomyIndexPage,
  type TaxonomyIndexItem,
} from "@/components/templates/public/common/TaxonomyIndexPage"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { HOME_PATH, TAGS_PATH, tagPath } from "@/lib/routes"
import { getTagsIndexPayload } from "@/lib/tags/page-cache"
import { buildPageMetadata } from "@/lib/metadata"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { BRAND_NAME } from "@/lib/brand"

const PAGE_TITLE = "Browse Tags"
const DIRECTORY_ITEM_LIST_LIMIT = 20

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: `Explore ${BRAND_NAME} products by keyword, technology, and niche to find apps, SaaS tools, APIs, and startup launches faster.`,
  canonical: TAGS_PATH,
})

export default async function TagsIndexPage() {
  const { initialItems, totalTags } = await getTagsIndexPayload()
  const items: TaxonomyIndexItem[] = initialItems.map((tag, index) => {
    const title = formatTagLabel(tag.canonical || tag.keyword)

    return {
      key: tag.slug,
      title,
      description: `Products tagged with ${title} across the Shipyard launch directory.`,
      href: tagPath(tag.slug),
      count: tag.productCount,
      icon: <Hash className="h-5 w-5" aria-hidden />,
      momentum: 5.2 + (index % 5) * 1.6,
      tone: index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "orange",
    }
  })
  const siteUrl = resolveSiteUrl()
  const pageUrl = `${siteUrl}${TAGS_PATH}`
  const itemListId = `${pageUrl}#itemlist`
  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    url: pageUrl,
    name: PAGE_TITLE,
    description: `Explore ${BRAND_NAME} products by keyword, technology, and niche across the launch directory.`,
    inLanguage: "en-US",
    numberOfItems: totalTags,
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
    name: `${BRAND_NAME} tag directory`,
    description: `Popular product tags, technologies, and launch niches indexed by ${BRAND_NAME}.`,
    numberOfItems: totalTags,
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
            name: item.title,
            url: itemUrl,
            description: item.description,
          },
        }
      }),
  }

  return (
    <TaxonomyIndexPage
      carbonPathname="/tags"
      title="Discover every keyword powering launches"
      description="Track the trends, technologies, and niches defining the next generation of high-performance products."
      searchPlaceholder={`Search ${totalTags.toLocaleString()}+ tags...`}
      itemsHeading="All Tags"
      items={items}
      totalItems={totalTags}
      pulseTitle="Tag Pulse"
      pulseStats={[
        { label: "Indexed tags", value: totalTags.toLocaleString() },
        {
          label: "Most active tag",
          value: items[0]?.title ?? "No tags yet",
        },
      ]}
      quickLinksTitle="Popular Tags"
      emptyTitle="No tags yet"
      emptyDescription="Once products add keywords, you will be able to explore them here."
      structuredData={
        <>
          <CoreStructuredData
            scriptKeyPrefix="tags"
            webPage={{ path: TAGS_PATH, name: PAGE_TITLE }}
            breadcrumbs={{
              items: [
                { name: "Home", path: HOME_PATH },
                { name: PAGE_TITLE, path: TAGS_PATH },
              ],
            }}
          />
          <JsonLdScript
            data={collectionPage}
            scriptKey="tags-collection-jsonld"
          />
          <JsonLdScript data={itemList} scriptKey="tags-itemlist-jsonld" />
        </>
      }
    />
  )
}
