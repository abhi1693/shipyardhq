import { siteConfig } from "@/lib/siteConfig"
import {
  buildWebApplicationStructuredData,
  type BuildWebApplicationStructuredDataOptions,
  type WebApplicationStructuredData,
} from "@/lib/seo/web-application"

export type MobileApplicationStructuredData = WebApplicationStructuredData & {
  "@type": "MobileApplication"
}

export type BuildMobileApplicationStructuredDataOptions =
  BuildWebApplicationStructuredDataOptions

export function buildMobileApplicationStructuredData(
  options: BuildMobileApplicationStructuredDataOptions = {},
): MobileApplicationStructuredData {
  const base = buildWebApplicationStructuredData({
    ...options,
    applicationCategory: options.applicationCategory?.trim() || "MobileApplication",
  })

  const idOverride = options.id?.trim()
  const defaultMobileId = base["@id"].endsWith("#webapplication")
    ? base["@id"].replace(/#webapplication$/, "#mobileapplication")
    : `${base.url}#mobileapplication`

  return {
    ...base,
    "@type": "MobileApplication",
    "@id": idOverride || defaultMobileId,
  }
}

export const defaultMobileApplicationStructuredData =
  buildMobileApplicationStructuredData({
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    operatingSystem: ["iOS", "Android"],
  })
