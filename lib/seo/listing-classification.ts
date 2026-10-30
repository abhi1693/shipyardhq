const EXPLICIT_SOFTWARE_TYPES = new Set([
  "saas",
  "browser_extension",
  "mobile_app",
  "desktop_app",
  "api",
])

/** Platform support is not an entity classification. In particular, `other`
 * and `open_source` do not establish that a listing is an application.
 * Do not reclassify legacy records from descriptions or platform tags.
 */
export function listingSchemaClassification(
  type: string | null | undefined,
  platforms: readonly string[],
) {
  return {
    softwareProduct: Boolean(type && EXPLICIT_SOFTWARE_TYPES.has(type)),
    webApplication: type === "saas" && platforms.includes("web"),
    mobileApplication:
      type === "mobile_app" &&
      platforms.some(
        (platform) => platform === "ios" || platform === "android",
      ),
  }
}
