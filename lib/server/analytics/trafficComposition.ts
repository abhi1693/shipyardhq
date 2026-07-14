export const TRAFFIC_COMPOSITION_SEGMENTS = [
  "browser",
  "verified_automated",
  "other",
] as const

export type TrafficCompositionSegment =
  (typeof TRAFFIC_COMPOSITION_SEGMENTS)[number]

export type TrafficCompositionClassification = {
  segment: TrafficCompositionSegment
  category: string
}

const REGULAR_BROWSER_NAMES = new Set(
  [
    "chrome",
    "chromederivative",
    "chromemobile",
    "chromemobilewebview",
    "chromium",
    "edge",
    "facebook",
    "firefox",
    "firefoxmobile",
    "ie",
    "instagram",
    "mobilesafari",
    "mobilesafariwebview",
    "opera",
    "operamobile",
    "safari",
    "samsunginternet",
    "ucbrowser",
    "ucbrowsermobile",
  ].map(normalizeIdentity),
)

const REGULAR_REQUEST_SOURCES = new Set(["", "eyeball"])
const AUTOMATION_MARKERS = [
  "bot",
  "crawler",
  "curl",
  "headless",
  "monitor",
  "preview",
  "spider",
  "synthetic",
  "wget",
]

function normalizeIdentity(value: string | null | undefined) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") ?? ""
  )
}

export function classifyTrafficComposition(args: {
  verifiedBotCategory?: string | null
  userAgentBrowser?: string | null
  requestSource?: string | null
}): TrafficCompositionClassification {
  const verifiedCategory = args.verifiedBotCategory?.trim()
  if (verifiedCategory) {
    return {
      segment: "verified_automated",
      category: verifiedCategory,
    }
  }

  const browser = normalizeIdentity(args.userAgentBrowser)
  const requestSource = normalizeIdentity(args.requestSource)
  if (
    REGULAR_REQUEST_SOURCES.has(requestSource) &&
    REGULAR_BROWSER_NAMES.has(browser)
  ) {
    return { segment: "browser", category: "Browser traffic" }
  }

  if (!REGULAR_REQUEST_SOURCES.has(requestSource)) {
    return { segment: "other", category: "Platform generated" }
  }

  if (AUTOMATION_MARKERS.some((marker) => browser.includes(marker))) {
    return { segment: "other", category: "Unverified automation" }
  }

  return { segment: "other", category: "Unclassified" }
}
