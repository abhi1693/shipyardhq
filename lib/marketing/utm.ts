export type UtmParams = {
  source?: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
}

// Append/merge UTM params onto a URL string safely.
// Leaves existing utm_* params intact unless explicitly overridden.
export function addUtmParams(rawUrl: string, params: UtmParams = {}): string {
  try {
    const url = new URL(rawUrl)
    const search = url.searchParams

    const map: Record<string, string | undefined> = {
      utm_source: params.source,
      utm_medium: params.medium,
      utm_campaign: params.campaign,
      utm_content: params.content,
      utm_term: params.term,
    }

    for (const [key, value] of Object.entries(map)) {
      if (!value) continue
      if (!search.has(key)) search.set(key, value)
    }

    url.search = search.toString()
    return url.toString()
  } catch {
    // If invalid URL (e.g., relative), return original string untouched.
    return rawUrl
  }
}
