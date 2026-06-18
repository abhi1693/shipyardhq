import { IconBrandChrome } from "@tabler/icons-react"
import {
  Globe2,
  Laptop,
  Monitor,
  Smartphone,
  TabletSmartphone,
} from "lucide-react"
import type { ReactNode } from "react"

import {
  TaxonomyIndexPage,
  type TaxonomyIndexItem,
} from "@/components/templates/public/common/TaxonomyIndexPage"
import { CoreStructuredData } from "@/components/seo/CoreStructuredData"
import {
  getPlatformMeta,
  PLATFORM_SLUGS,
  type PlatformSlug,
} from "@/lib/platforms/config"
import { getPlatformPagePayload } from "@/lib/platforms/page-cache"
import { HOME_PATH, PLATFORMS_PATH, platformPath } from "@/lib/routes"
import { buildPageMetadata } from "@/lib/metadata"

export const revalidate = 300

const PAGE_TITLE = "Platforms"

export const metadata = buildPageMetadata({
  title: PAGE_TITLE,
  description:
    "Browse Shipyard products by platform, from web apps to mobile apps, desktop software, and browser extensions.",
  canonical: PLATFORMS_PATH,
})

const platformIcons: Record<PlatformSlug, ReactNode> = {
  web: <Globe2 className="h-5 w-5" aria-hidden />,
  ios: <Smartphone className="h-5 w-5" aria-hidden />,
  android: <TabletSmartphone className="h-5 w-5" aria-hidden />,
  mac: <Laptop className="h-5 w-5" aria-hidden />,
  windows: <Monitor className="h-5 w-5" aria-hidden />,
  linux: <Monitor className="h-5 w-5" aria-hidden />,
  chrome: <IconBrandChrome className="h-5 w-5" aria-hidden />,
}

export default async function PlatformsPage() {
  const platformItems = await Promise.all(
    PLATFORM_SLUGS.map(async (slug, index) => {
      const meta = getPlatformMeta(slug)
      const payload = await getPlatformPagePayload(slug, {
        sort: "new",
        page: 1,
        verified: false,
      })

      if (!meta) {
        throw new Error(`Missing platform metadata for ${slug}`)
      }

      return {
        key: meta.slug,
        title: meta.label,
        description: meta.description,
        href: platformPath(meta.slug),
        count: payload?.total ?? 0,
        icon: platformIcons[slug],
        momentum: 4.1 + (index % 4) * 1.7,
        tone: index % 3 === 0 ? "blue" : index % 3 === 1 ? "green" : "orange",
      } satisfies TaxonomyIndexItem
    }),
  )

  const items: TaxonomyIndexItem[] = platformItems
  const totalProducts = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <TaxonomyIndexPage
      title="Discover products by platform"
      description="Find launches by the surfaces they ship on, from web and mobile to desktop apps and browser extensions."
      searchPlaceholder={`Search ${items.length.toLocaleString()} platforms...`}
      itemsHeading="All Platforms"
      items={items}
      totalItems={items.length}
      pulseTitle="Platform Pulse"
      pulseStats={[
        { label: "Active platforms", value: items.length.toLocaleString() },
        { label: "Mapped products", value: totalProducts.toLocaleString() },
        {
          label: "Largest platform",
          value:
            [...items].sort((a, b) => b.count - a.count)[0]?.title ??
            "No platforms yet",
        },
      ]}
      quickLinksTitle="Popular Platforms"
      emptyTitle="No platforms yet"
      emptyDescription="Once products declare their supported platforms, this directory will populate automatically."
      structuredData={
        <CoreStructuredData
          scriptKeyPrefix="platforms"
          webPage={{ path: PLATFORMS_PATH, name: PAGE_TITLE }}
          breadcrumbs={{
            items: [
              { name: "Home", path: HOME_PATH },
              { name: PAGE_TITLE, path: PLATFORMS_PATH },
            ],
          }}
        />
      }
    />
  )
}
