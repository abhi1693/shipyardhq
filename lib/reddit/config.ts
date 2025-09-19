import path from "node:path"
import { readFileSync } from "node:fs"

export type SubredditStatus = "allow" | "review" | "deny"

export type SubredditConfigEntry = {
  name: string
  intent?: string
  notes?: string
  status?: SubredditStatus
  ruleSummary?: string
  lastReviewedAt?: string
  confidence?: number
}

export type FileConfig = {
  subreddits?: SubredditConfigEntry[]
  keywords?: string[]
  allowedFlairs?: string[]
}

export type LoadedFileConfig = FileConfig & { path?: string }

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
  "product",
  "showcase",
  "feedback",
  "built",
  "app",
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

function normalizeStatus(status?: SubredditConfigEntry["status"]): SubredditStatus {
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
