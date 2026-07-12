import { JsonLdScript } from "next-seo"

import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import { ToolsIndexPage } from "@/components/templates/public/tools"
import { buildPageMetadata } from "@/lib/metadata"
import { HOME_PATH, TOOLS_PATH } from "@/lib/routes"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { FREE_SEO_TOOLS, freeToolPath } from "@/lib/tools/catalog"

const PAGE_TITLE = "Free SEO Tools for Startups"
const PAGE_DESCRIPTION =
  "Use ten free SEO tools built for founders to improve product-page copy, search snippets, social previews, schema, crawler rules, and sitemaps."

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  canonical: TOOLS_PATH,
})

export default function FreeToolsPage() {
  const siteUrl = resolveSiteUrl()
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${siteUrl}${TOOLS_PATH}#itemlist`,
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    numberOfItems: FREE_SEO_TOOLS.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: FREE_SEO_TOOLS.map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.name,
      url: `${siteUrl}${freeToolPath(tool.slug)}`,
    })),
  }

  return (
    <ToolsIndexPage
      structuredData={
        <>
          <CoreStructuredData
            scriptKeyPrefix="free-seo-tools"
            webPage={{
              path: TOOLS_PATH,
              name: PAGE_TITLE,
              description: PAGE_DESCRIPTION,
            }}
            breadcrumbs={{
              items: [
                { name: "Home", path: HOME_PATH },
                { name: "Free SEO Tools", path: TOOLS_PATH },
              ],
            }}
          />
          <JsonLdScript
            data={itemList}
            scriptKey="free-seo-tools-itemlist-jsonld"
          />
        </>
      }
    />
  )
}
