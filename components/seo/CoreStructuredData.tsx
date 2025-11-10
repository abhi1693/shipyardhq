import { JsonLdScript } from "next-seo"

import { buildBreadcrumbListStructuredData } from "@/lib/seo/breadcrumbs"
import type {
  BreadcrumbInput,
  BuildBreadcrumbListStructuredDataOptions,
} from "@/lib/seo/breadcrumbs"
import { organizationStructuredData } from "@/lib/seo/organization"
import {
  buildWebPageStructuredData,
  type BuildWebPageStructuredDataOptions,
} from "@/lib/seo/webpage"
import {
  buildWebSiteStructuredData,
  type BuildWebSiteStructuredDataOptions,
} from "@/lib/seo/website"

type CoreStructuredDataProps = {
  webPage?: BuildWebPageStructuredDataOptions
  webSite?: BuildWebSiteStructuredDataOptions
  breadcrumbs?: {
    items: BreadcrumbInput[]
    options?: BuildBreadcrumbListStructuredDataOptions
  }
  /** Optional prefix applied to the script keys to avoid collisions. */
  scriptKeyPrefix?: string
}

export function CoreStructuredData({
  webPage,
  webSite,
  breadcrumbs,
  scriptKeyPrefix = "core",
}: CoreStructuredDataProps) {
  const webSiteData = buildWebSiteStructuredData(webSite)
  const webPageData = buildWebPageStructuredData(webPage)
  const breadcrumbData = breadcrumbs
    ? buildBreadcrumbListStructuredData(
        breadcrumbs.items,
        breadcrumbs.options,
      )
    : undefined

  const makeKey = (suffix: string) => `${scriptKeyPrefix}-${suffix}`

  return (
    <>
      <JsonLdScript
        data={organizationStructuredData}
        scriptKey={makeKey("organization-jsonld")}
      />
      <JsonLdScript
        data={webSiteData}
        scriptKey={makeKey("website-jsonld")}
      />
      <JsonLdScript
        data={webPageData}
        scriptKey={makeKey("webpage-jsonld")}
      />
      {breadcrumbData ? (
        <JsonLdScript
          data={breadcrumbData}
          scriptKey={makeKey("breadcrumbs-jsonld")}
        />
      ) : null}
    </>
  )
}
