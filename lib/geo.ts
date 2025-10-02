type RegionDisplayNames = {
  of(code: string): string | undefined
}

let countryDisplayNames: RegionDisplayNames | null = null

if (
  typeof Intl !== "undefined" &&
  typeof (Intl as any).DisplayNames === "function"
) {
  try {
    countryDisplayNames = new (Intl as any).DisplayNames(["en"], {
      type: "region",
    }) as RegionDisplayNames
  } catch {
    countryDisplayNames = null
  }
}

export function formatCountryName(country?: string | null): string {
  if (!country) return "Unknown"
  const trimmed = country.trim()
  if (!trimmed) return "Unknown"

  if (countryDisplayNames) {
    try {
      const resolved = countryDisplayNames.of(trimmed)
      if (resolved) {
        return resolved
      }
    } catch {
      // ignore lookup failures and fall through to the raw value
    }
  }

  return trimmed
}
