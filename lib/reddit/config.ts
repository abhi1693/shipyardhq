import path from "node:path"
import { readFileSync } from "node:fs"

export type SubredditStatus = "allow" | "review" | "deny"

export type SubredditConfigEntry = {
  name: string
  intent?: string | string[]
  notes?: string | string[]
  status?: SubredditStatus
  ruleSummary?: string | string[]
  lastReviewedAt?: string
  confidence?: number
}

export type FileConfig = {
  subreddits?: SubredditConfigEntry[]
  keywords?: string[]
  allowedFlairs?: string[]
  discovery?: DiscoveryConfig
}

export type LoadedFileConfig = FileConfig & { path?: string }

export type DiscoveryConfig = {
  targetProfile?: string
  includeKeywords?: string[]
  excludeKeywords?: string[]
  minIntentScore?: number
  sorts?: string[]
  timeFilters?: string[]
  resultsPerQuery?: number
}

export const DEFAULT_CONFIG_FILE = path.join(
  process.cwd(),
  "config",
  "reddit-bot.config.json",
)

export const DEFAULT_SUBREDDITS = [
  "startups",
  "Entrepreneur",
  "smallbusiness",
  "Entrepreneurship",
  "business",
  "IndieHackers",
  "SaaS",
  "SaaS_Talk",
  "EntrepreneurRideAlong",
  "bootstrapping",
  "WebApps",
  "alphaandbetausers",
  "ProductFeedback",
  "DesignCritiques",
  "AppHookup",
  "InternetIsBeautiful",
  "SideProject",
  "SideHustle",
  "BuildInPublic",
  "selfhosted",
  "opensource",
  "indiebiz",
  "webdev",
  "frontend",
  "coding",
  "learnprogramming",
]

export const DEFAULT_KEYWORDS = [
  "launch",
  "startup",
  "startups",
  "founder",
  "founders",
  "indie hacker",
  "indie hackers",
  "saas",
  "product",
  "product launch",
  "product marketing",
  "showcase",
  "feedback",
  "app",
  "apps",
  "mvp",
  "side project",
  "build in public",
  "demo",
  "beta",
  "distribution",
  "go to market",
  "growth marketing",
]

export const DEFAULT_ALLOWED_FLAIRS = [
  "showoff",
  "showcase",
  "launch",
  "feedback",
  "demo",
  "beta",
  "product",
  "milestone",
]

export const DEFAULT_DISCOVERY_TARGET_PROFILE =
  "founders, indie hackers, and SaaS builders looking for product feedback and distribution"

export const DEFAULT_DISCOVERY_INCLUDE_KEYWORDS = [
  "founder",
  "founders",
  "startup",
  "startups",
  "entrepreneur",
  "indie hacker",
  "indie hackers",
  "saas",
  "bootstrapping",
  "ship",
  "build in public",
  "product feedback",
  "side project",
  "maker",
  "launch",
  "launch feedback",
  "product launch",
  "launch your product",
  "product hunt",
  "app",
  "apps",
  "app launch",
  "beta",
  "beta tester",
  "beta testers",
  "demo",
  "demo day",
  "feedback",
  "product marketing",
  "go to market",
  "growth marketing",
  "distribution",
]

export const DEFAULT_DISCOVERY_EXCLUDE_KEYWORDS = [
  "rocket",
  "space",
  "spacex",
  "nasa",
  "crypto",
  "bitcoin",
  "nft",
  "gambling",
  "sportsbook",
  "gaming",
  "fortnite",
  "apex",
  "porn",
  "nsfw",
]

export const DEFAULT_DISCOVERY_MIN_INTENT_SCORE = 1

export const DEFAULT_DISCOVERY_SORTS = ["relevance", "new", "top"]

export const DEFAULT_DISCOVERY_TIME_FILTERS = [
  "day",
  "week",
  "month",
  "year",
  "all",
]

export const DEFAULT_DISCOVERY_RESULTS_PER_QUERY = 60

export function loadBotFileConfig(
  filePath: string = DEFAULT_CONFIG_FILE,
): LoadedFileConfig {
  try {
    const raw = readFileSync(filePath, "utf-8")
    const parsed = JSON.parse(raw) as FileConfig
    if (parsed && typeof parsed === "object") {
      return { ...parsed, path: filePath }
    }
    console.warn(
      `Ignoring reddit config at ${filePath} because it is not an object.`,
    )
    return { path: filePath }
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      console.warn(`Failed to load reddit config file at ${filePath}:`, error)
    }
    return { path: filePath }
  }
}

export function parseList(value?: string | null): string[] | null {
  if (!value) {
    return null
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function resolveStringList(
  envList: string[] | null,
  configList?: string[] | null,
  fallback: string[] = [],
): string[] {
  if (envList && envList.length) {
    return dedupe(envList)
  }

  if (configList && configList.length) {
    return dedupe(configList)
  }

  return dedupe(fallback)
}

export function categorizeSubreddits(entries: SubredditConfigEntry[]) {
  const ready: SubredditConfigEntry[] = []
  const review: SubredditConfigEntry[] = []
  const deny: SubredditConfigEntry[] = []

  for (const entry of entries) {
    const normalized = normalizeStatus(entry.status)

    if (normalized === "allow") {
      ready.push(entry)
      continue
    }

    if (normalized === "deny") {
      deny.push(entry)
      continue
    }

    review.push(entry)
  }

  return { ready, review, deny }
}

function normalizeStatus(
  status?: SubredditConfigEntry["status"],
): SubredditStatus {
  if (!status) {
    return "review"
  }

  const value = `${status}`.toLowerCase() as SubredditStatus
  if (value === "allow" || value === "deny") {
    return value
  }

  return "review"
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>()
  for (const value of values) {
    const trimmed = value.trim()
    if (trimmed) {
      seen.add(trimmed)
    }
  }
  return Array.from(seen)
}
