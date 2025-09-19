import dotenv from "dotenv"
import Snoowrap from "snoowrap"
import path from "node:path"
import { promises as fs } from "node:fs"
import {
  DEFAULT_ALLOWED_FLAIRS,
  DEFAULT_CONFIG_FILE,
  DEFAULT_KEYWORDS,
  DEFAULT_DISCOVERY_TARGET_PROFILE,
  DEFAULT_DISCOVERY_INCLUDE_KEYWORDS,
  DEFAULT_DISCOVERY_EXCLUDE_KEYWORDS,
  DEFAULT_DISCOVERY_MIN_INTENT_SCORE,
  SubredditConfigEntry,
  SubredditStatus,
  categorizeSubreddits,
  loadBotFileConfig,
  resolveStringList,
} from "../lib/reddit/config"

dotenv.config()
dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
  override: false,
})

const DEFAULT_RESULTS_FILE =
  process.env.REDDIT_DISCOVERY_RESULTS_FILE ||
  path.join(process.cwd(), "tmp", "reddit-discovery-results.json")

type DiscoveryArgs = {
  queries: string[]
  limit: number
  minSubscribers: number
  includeNsfw: boolean
  write: boolean
  model: string
  skipExisting: boolean
  quiet: boolean
  minIntentScore?: number
  concurrency: number
}

type Candidate = {
  name: string
  queries: Set<string>
  subreddit: any
}

type SubredditRule = {
  short_name: string
  description?: string
}

type SubredditDetails = {
  name: string
  title: string
  description: string
  subscribers: number
  activeUserCount?: number
  over18?: boolean
  url: string
  queries: string[]
  rules: SubredditRule[]
  siteRules: string[]
}

type AiAssessment = {
  verdict: "allow" | "manual_review" | "avoid"
  confidence: number
  summary: string
  riskFactors?: string[]
  suggestedIntent?: string
  messagingTips?: string | string[]
  referencedRules?: string[]
}

type DiscoveryResult = {
  details: SubredditDetails
  assessment: AiAssessment
  status: SubredditStatus
  configEntry: SubredditConfigEntry
  intent: IntentEvaluation
}

type LoadedConfig = ReturnType<typeof loadBotFileConfig>

type SnooRuleResponse = {
  rules: SubredditRule[]
  site_rules: string[]
}

const OPENAI_URL = "https://api.openai.com/v1/responses"

type IntentEvaluation = {
  score: number
  includeMatches: string[]
  excludeMatches: string[]
}

type CandidateProcessingContext = {
  args: DiscoveryArgs
  includeKeywords: string[]
  excludeKeywords: string[]
  minIntentScore: number
  targetProfile: string
  cooldownMs: number
}

type SkipRecord = {
  name: string
  reason: string
  statusCode?: number
}

type PersistedResult = {
  subreddit: string
  status?: SubredditStatus
  assessment?: AiAssessment
  configEntry?: SubredditConfigEntry
  subscribers?: number
  queries?: string[]
  intent?: IntentEvaluation
  details?: Partial<SubredditDetails>
}

type PersistedDocument =
  | PersistedResult[]
  | {
      results?: PersistedResult[]
      skips?: SkipRecord[]
      generatedAt?: string
    }

type RunContext = {
  outputPath: string
  results: DiscoveryResult[]
  skips: SkipRecord[]
  startedAt: string
  processedNames: Set<string>
}

let runContext: RunContext | null = null
let handlingSignal = false

process.on("SIGINT", () => handleInterrupt("SIGINT"))
process.on("SIGTERM", () => handleInterrupt("SIGTERM"))

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const configPath = process.env.REDDIT_CONFIG_FILE || DEFAULT_CONFIG_FILE
  const fileConfig = loadBotFileConfig(configPath)
  const existingNames = new Set(
    (fileConfig.subreddits || []).map((entry) => entry.name.toLowerCase()),
  )
  const discoveryConfig = fileConfig.discovery || {}
  const reddit = createRedditClient()

  const defaultQueries = resolveStringList(
    null,
    fileConfig.keywords,
    DEFAULT_KEYWORDS,
  )
  const queryList = args.queries.length ? args.queries : defaultQueries

  const includeKeywords = resolveStringList(
    null,
    discoveryConfig.includeKeywords,
    DEFAULT_DISCOVERY_INCLUDE_KEYWORDS,
  ).map((keyword) => keyword.toLowerCase())

  const excludeKeywords = resolveStringList(
    null,
    discoveryConfig.excludeKeywords,
    DEFAULT_DISCOVERY_EXCLUDE_KEYWORDS,
  ).map((keyword) => keyword.toLowerCase())

  const targetProfile = (
    discoveryConfig.targetProfile || DEFAULT_DISCOVERY_TARGET_PROFILE
  ).trim()

  const minIntentScore =
    args.minIntentScore ??
    (typeof discoveryConfig.minIntentScore === "number"
      ? discoveryConfig.minIntentScore
      : DEFAULT_DISCOVERY_MIN_INTENT_SCORE)

  const resultsPath = DEFAULT_RESULTS_FILE

  runContext = {
    outputPath: resultsPath,
    results: [],
    skips: [],
    startedAt: new Date().toISOString(),
    processedNames: new Set<string>(),
  }

  await seedRunContextFromExisting(runContext)

  if (!queryList.length) {
    console.error(
      "No discovery queries provided. Use --query or add keywords to the config file.",
    )
    process.exit(1)
  }

  const concurrencyLimit = Math.max(1, args.concurrency || 1)
  const envCooldown = process.env.REDDIT_DISCOVERY_CANDIDATE_COOLDOWN_MS
  const parsedCooldown = envCooldown !== undefined ? Number(envCooldown) : NaN
  const cooldownMs = Math.max(
    0,
    Number.isFinite(parsedCooldown)
      ? parsedCooldown
      : Math.round(400 / concurrencyLimit),
  )

  console.log("Starting subreddit discovery run.")
  console.log(`Using config file: ${configPath}`)
  console.log(`Queries     : ${queryList.join(", ")}`)
  console.log(`Limit/query : ${args.limit}`)
  console.log(`Min subs    : ${args.minSubscribers}`)
  console.log(`Include NSFW: ${args.includeNsfw}`)
  console.log(`Write config: ${args.write}`)
  console.log(`Target ICP  : ${targetProfile}`)
  console.log(`Intent match : ${includeKeywords.join(", ")}`)
  console.log(`Intent deny  : ${excludeKeywords.join(", ")}`)
  console.log(`Min intent   : ${minIntentScore}`)
  console.log(`Concurrency : ${concurrencyLimit}`)
  console.log(
    `Cooldown    : ${cooldownMs}ms between candidate scoring per worker`,
  )

  const candidateMap = new Map<string, Candidate>()

  for (const query of queryList) {
    console.log(`\nSearching for subreddits matching "${query}"...`)
    const searchParams: any = {
      query,
      limit: args.limit,
      sort: "relevance",
    }

    if (args.includeNsfw) {
      searchParams.include_over_18 = true
    }

    const listing = (await reddit.searchSubreddits(searchParams)) as any

    const results = Array.from(listing as any[])

    for (const sub of results.slice(0, args.limit)) {
      const name = sanitizeName(sub.display_name || sub.display_name_prefixed)
      if (!name) {
        continue
      }

      const key = name.toLowerCase()
      if (args.skipExisting && existingNames.has(key)) {
        if (!args.quiet) {
          console.log(`Skipping r/${name} (already in config).`)
        }
        recordSkip(name, "already in config")
        continue
      }

      if (runContext?.processedNames.has(key)) {
        if (!args.quiet) {
          console.log(`Skipping r/${name} (already processed in previous run).`)
        }
        recordSkip(name, "already processed", undefined)
        continue
      }

      const existing = candidateMap.get(key)
      if (existing) {
        existing.queries.add(query)
        continue
      }

      candidateMap.set(key, {
        name,
        queries: new Set([query]),
        subreddit: sub,
      })
    }

    await sleep(500)
  }

  if (!candidateMap.size) {
    console.log("No subreddits found for the supplied queries.")
    return
  }

  const candidates = Array.from(candidateMap.values())
  const processingContext: CandidateProcessingContext = {
    args,
    includeKeywords,
    excludeKeywords,
    minIntentScore,
    targetProfile,
    cooldownMs,
  }

  const processedResults = await runWithConcurrency(
    candidates,
    concurrencyLimit,
    async (candidate) => processCandidate(candidate, processingContext),
  )

  const combinedResults = processedResults.filter(
    (result): result is DiscoveryResult => Boolean(result),
  )

  if (!combinedResults.length) {
    console.log("No candidate subreddits passed the filters.")
  } else {
    console.log(
      `\nProcessed ${combinedResults.length} new subreddits in this run.`,
    )
  }

  const accumulatedResults = dedupeResultsByName(runContext?.results || [])
  const sortedResults = sortResults(accumulatedResults)

  if (runContext) {
    runContext.results = sortedResults
  }

  const counts = sortedResults.reduce(
    (acc, item) => {
      acc[item.status] += 1
      return acc
    },
    { allow: 0, review: 0, deny: 0 } as Record<SubredditStatus, number>,
  )

  console.log(
    `\nSummary: ${counts.allow} allow / ${counts.review} review / ${counts.deny} deny`,
  )

  await persistResults(sortedResults, runContext?.outputPath, runContext?.skips)

  if (args.write) {
    await updateConfig(fileConfig, sortedResults, configPath)
  } else {
    console.log(
      "\nRun with --write to merge these findings into the discovery config file.",
    )
  }

  runContext = null
}

function parseArgs(argv: string[]): DiscoveryArgs {
  const result: DiscoveryArgs = {
    queries: [],
    limit: 15,
    minSubscribers: 500,
    includeNsfw: false,
    write: false,
    model:
      process.env.OPENAI_DISCOVERY_MODEL ||
      process.env.OPENAI_MODEL ||
      "gpt-4.1-mini",
    skipExisting: false,
    quiet: false,
    minIntentScore: undefined,
    concurrency: Number(process.env.REDDIT_DISCOVERY_CONCURRENCY || "3"),
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    switch (arg) {
      case "--query":
      case "-q": {
        const value = argv[index + 1]
        if (!value) {
          throw new Error("--query expects a value")
        }
        index += 1
        const parts = value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
        result.queries.push(...parts)
        break
      }
      case "--limit": {
        const value = Number(argv[index + 1])
        if (Number.isNaN(value) || value <= 0) {
          throw new Error("--limit expects a positive number")
        }
        result.limit = value
        index += 1
        break
      }
      case "--min-subscribers": {
        const value = Number(argv[index + 1])
        if (Number.isNaN(value) || value < 0) {
          throw new Error("--min-subscribers expects a non-negative number")
        }
        result.minSubscribers = value
        index += 1
        break
      }
      case "--include-nsfw":
        result.includeNsfw = true
        break
      case "--write":
        result.write = true
        break
      case "--model": {
        const value = argv[index + 1]
        if (!value) {
          throw new Error("--model expects a value")
        }
        result.model = value
        index += 1
        break
      }
      case "--skip-existing":
        result.skipExisting = true
        break
      case "--min-intent-score": {
        const value = Number(argv[index + 1])
        if (Number.isNaN(value) || value < 0) {
          throw new Error("--min-intent-score expects a non-negative number")
        }
        result.minIntentScore = value
        index += 1
        break
      }
      case "--quiet":
        result.quiet = true
        break
      case "--concurrency": {
        const value = Number(argv[index + 1])
        if (Number.isNaN(value) || value <= 0) {
          throw new Error("--concurrency expects a positive number")
        }
        result.concurrency = value
        index += 1
        break
      }
      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
        break
      default:
        throw new Error(`Unrecognized argument: ${arg}`)
    }
  }

  return result
}

function printHelp() {
  console.log(`Usage: npm run reddit:discover -- [options]

Options:
  --query, -q            Comma-separated search terms (default: config keywords)
  --limit                Max subreddits to fetch per query (default 15)
  --min-subscribers      Minimum subscriber count (default 500)
  --include-nsfw         Include NSFW communities
  --model                OpenAI model for rule analysis (default ENV or gpt-4.1-mini)
  --write                Persist suggested entries to the config file
  --skip-existing        Skip communities that already have a config entry
  --min-intent-score     Minimum intent keyword matches before AI scoring (default config)
  --quiet                Suppress skip messages
  --help, -h             Show this help message
`)
}

function createRedditClient() {
  const reddit = new Snoowrap({
    userAgent:
      process.env.REDDIT_USER_AGENT ||
      "shipyardhq-reddit-discovery/1.0 (+https://shipyardhq.dev)",
    clientId: requireEnv("REDDIT_CLIENT_ID"),
    clientSecret: requireEnv("REDDIT_CLIENT_SECRET"),
    username: requireEnv("REDDIT_USERNAME"),
    password: requireEnv("REDDIT_PASSWORD"),
  })

  const requestDelay = parseInt(
    process.env.REDDIT_DISCOVERY_REQUEST_DELAY_MS || "1400",
    10,
  )

  reddit.config({ requestDelay, warnings: false })
  return reddit
}

async function fetchSubredditDetails(
  candidate: Candidate,
): Promise<SubredditDetails | null> {
  try {
    const fetched = await candidate.subreddit.fetch()
    const ruleResponse =
      (await candidate.subreddit.getRules()) as SnooRuleResponse

    return {
      name: candidate.name,
      title: fetched.title || "",
      description: sanitizeText(fetched.public_description || ""),
      subscribers: fetched.subscribers || 0,
      activeUserCount: fetched.accounts_active,
      over18: Boolean(fetched.over18),
      url: fetched.url || `/r/${candidate.name}`,
      queries: Array.from(candidate.queries),
      rules: (ruleResponse.rules || []).map((rule) => ({
        short_name: rule.short_name,
        description: rule.description,
      })),
      siteRules: ruleResponse.site_rules || [],
    }
  } catch (error) {
    const redditError = parseRedditError(error)
    const reason = redditError.reason || redditError.message || "unknown error"
    const status = redditError.statusCode
      ? ` (status ${redditError.statusCode})`
      : ""
    recordSkip(candidate.name, reason, redditError.statusCode)
    console.warn(`Skipping r/${candidate.name}: ${reason}${status}`)
    return null
  }
}

async function assessSubreddit(
  details: SubredditDetails,
  model: string,
  targetProfile: string,
  intent: IntentEvaluation,
  includeKeywords: string[],
  excludeKeywords: string[],
): Promise<AiAssessment | null> {
  const openAIApiKey = process.env.OPENAI_API_KEY
  if (!openAIApiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment")
  }

  const trimmedRules = details.rules.slice(0, 12)

  const rulesText = trimmedRules
    .map((rule, index) => {
      const label = rule.short_name || `Rule ${index + 1}`
      const description = sanitizeText(rule.description || "")
      return `${label}: ${description}`
    })
    .join("\n")

  const payload = {
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `You review subreddit rules to decide if Shipyard HQ can safely engage founders about listing their product. Shipyard HQ serves ${targetProfile}. Outreach is limited to posting a single helpful reply comment on an existing thread (never creating a new post). If the community audience does not align with this target, or if rules ban promotional comments or solicitation in replies, set verdict to "avoid" even when standalone posts are permitted. Analyse the policies, call out any comment-specific restrictions, and respond with ONLY a JSON object.`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Subreddit: r/${details.name}
Title: ${details.title}
Subscribers: ${details.subscribers}
Active accounts: ${details.activeUserCount ?? "unknown"}
NSFW: ${details.over18 ? "yes" : "no"}
Queries matched: ${details.queries.join(", ")}
Description: ${details.description || "(none)"}
Target profile: ${targetProfile}
Intent matches: ${intent.includeMatches.join(", ") || "(none)"}
Intent exclusions: ${intent.excludeMatches.join(", ") || "(none)"}
Intent score: ${intent.score}
Preferred include keywords: ${includeKeywords.join(", ")}
Excluded keywords: ${excludeKeywords.join(", ")}
Rules:\n${rulesText || "(no rules listed)"}
Global rules: ${details.siteRules.join(", ") || "(none)"}
Instruction: Return JSON with keys verdict (allow|manual_review|avoid), confidence (0-1), summary, riskFactors (array), suggestedIntent, messagingTips, referencedRules (array). Highlight if comments or replies are disallowed for promotion even when posts are allowed.`,
          },
        ],
      },
    ],
    max_output_tokens: Number(process.env.OPENAI_DISCOVERY_MAX_TOKENS || 320),
    temperature: Number(process.env.OPENAI_DISCOVERY_TEMPERATURE || "0.2"),
  }

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI API error:", errorText)
      return null
    }

    const data = await response.json()
    const text = extractOutputText(data)

    if (!text) {
      console.error("OpenAI API returned no content.")
      return null
    }

    const parsed = parseAssessmentJson(text)
    if (!parsed) {
      console.error("Failed to parse OpenAI response. Raw output:", text)
    }
    return parsed
  } catch (error) {
    console.error("Failed to call OpenAI API:", error)
    return null
  }
}

function buildConfigEntry(
  details: SubredditDetails,
  assessment: AiAssessment,
  intent: IntentEvaluation,
): SubredditConfigEntry {
  const now = new Date().toISOString()
  const intentDescription =
    assessment.suggestedIntent || summarizeIntent(details)
  const intentNotes = intent.includeMatches.length
    ? `Intent score ${intent.score}: ${intent.includeMatches.join(", ")}`
    : intent.score > 0
      ? `Intent score ${intent.score}`
      : undefined
  const notes = mergeText(
    assessment.messagingTips,
    assessment.riskFactors?.length
      ? `Risks: ${assessment.riskFactors.join("; ")}`
      : undefined,
    intentNotes,
  )
  const ruleSummary = mergeText(
    assessment.summary,
    assessment.referencedRules?.length
      ? assessment.referencedRules.join("; ")
      : undefined,
  )

  return {
    name: details.name,
    status: verdictToStatus(assessment.verdict),
    intent: intentDescription,
    notes,
    ruleSummary,
    confidence: assessment.confidence,
    lastReviewedAt: now,
  }
}

function verdictToStatus(verdict: AiAssessment["verdict"]): SubredditStatus {
  switch (verdict) {
    case "allow":
      return "allow"
    case "manual_review":
      return "review"
    case "avoid":
    default:
      return "deny"
  }
}

function displayResult(result: DiscoveryResult) {
  const { details, assessment, configEntry, intent } = result
  const divider = "\n────────────────────────────────────────────────────"
  console.log(divider)
  const verdictLabel = assessment.verdict.toUpperCase()
  const confidencePct = Math.round((assessment.confidence || 0) * 100)
  console.log(
    `r/${details.name} — ${verdictLabel} (${confidencePct}% confidence)`,
  )
  console.log(
    `Subscribers : ${formatNumber(details.subscribers)} | Active: ${formatNumber(details.activeUserCount || 0)}`,
  )
  console.log(`Queries     : ${details.queries.join(", ")}`)
  console.log(
    `Intent      : score ${intent.score} | include: ${intent.includeMatches.join(", ") || "(none)"}`,
  )
  if (intent.excludeMatches.length) {
    console.log(`Intent deny : ${intent.excludeMatches.join(", ")}`)
  }
  if (details.description) {
    console.log(`About       : ${truncate(details.description, 160)}`)
  }
  console.log(`Summary     : ${assessment.summary}`)
  if (assessment.messagingTips) {
    const tips = Array.isArray(assessment.messagingTips)
      ? assessment.messagingTips.join(" | ")
      : assessment.messagingTips
    console.log(`Messaging   : ${tips}`)
  }
  if (assessment.riskFactors?.length) {
    console.log("Risks       :")
    for (const risk of assessment.riskFactors) {
      console.log(`  - ${risk}`)
    }
  }
  if (assessment.referencedRules?.length) {
    console.log("Rules       :")
    for (const rule of assessment.referencedRules) {
      console.log(`  - ${rule}`)
    }
  }
  console.log("Suggested config entry:")
  console.log(JSON.stringify(configEntry, null, 2))
}

async function persistResults(
  results: DiscoveryResult[],
  outputPath?: string,
  skips?: SkipRecord[],
) {
  const resultsPath = outputPath || DEFAULT_RESULTS_FILE
  const dedupedResults = dedupeResultsByName(results)
  const payload: PersistedDocument = {
    generatedAt: new Date().toISOString(),
    results: dedupedResults.map(serializeResult),
    skips: dedupeSkips(skips || []),
  }

  await ensureDir(path.dirname(resultsPath))
  await fs.writeFile(resultsPath, JSON.stringify(payload, null, 2))
  console.log(`\nSaved raw results to ${resultsPath}`)
}

async function updateConfig(
  fileConfig: LoadedConfig,
  results: DiscoveryResult[],
  configPath: string,
) {
  const existingEntries = [...(fileConfig.subreddits || [])]
  const entryMap = new Map<string, SubredditConfigEntry>()

  for (const entry of existingEntries) {
    entryMap.set(entry.name.toLowerCase(), entry)
  }

  for (const result of results) {
    const key = result.configEntry.name.toLowerCase()
    const merged = mergeEntries(entryMap.get(key), result.configEntry)
    entryMap.set(key, merged)
  }

  const mergedEntries = Array.from(entryMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const updatedConfig = {
    ...fileConfig,
    subreddits: mergedEntries,
    keywords: fileConfig.keywords || DEFAULT_KEYWORDS,
    allowedFlairs: fileConfig.allowedFlairs || DEFAULT_ALLOWED_FLAIRS,
  }

  const { path: _path, ...serializable } = updatedConfig
  void _path

  await ensureDir(path.dirname(configPath))
  await fs.writeFile(configPath, JSON.stringify(serializable, null, 2))

  const { ready, review, deny } = categorizeSubreddits(mergedEntries)
  console.log(
    `\nConfig updated: ${mergedEntries.length} entries (${ready.length} allow / ${review.length} review / ${deny.length} deny).`,
  )
}

function mergeEntries(
  existing: SubredditConfigEntry | undefined,
  incoming: SubredditConfigEntry,
): SubredditConfigEntry {
  if (!existing) {
    return incoming
  }

  return {
    ...existing,
    ...incoming,
    intent: incoming.intent || existing.intent,
    notes: mergeText(incoming.notes, existing.notes),
    ruleSummary: mergeText(incoming.ruleSummary, existing.ruleSummary),
    confidence: incoming.confidence ?? existing.confidence,
    lastReviewedAt: incoming.lastReviewedAt || existing.lastReviewedAt,
    status: incoming.status || existing.status,
  }
}

function statusRank(status: SubredditStatus): number {
  switch (status) {
    case "allow":
      return 0
    case "review":
      return 1
    case "deny":
    default:
      return 2
  }
}

function sortResults(results: DiscoveryResult[]): DiscoveryResult[] {
  return [...results].sort((a, b) => {
    const order = statusRank(a.status) - statusRank(b.status)
    if (order !== 0) {
      return order
    }

    return (b.assessment.confidence || 0) - (a.assessment.confidence || 0)
  })
}

function sanitizeName(value?: string | null): string {
  if (!value) {
    return ""
  }
  return value.replace(/^r\//i, "").trim()
}

function sanitizeText(value?: string | null): string {
  if (!value) {
    return ""
  }

  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function summarizeIntent(details: SubredditDetails): string {
  if (details.description) {
    return truncate(details.description, 140)
  }
  return `Community for ${details.title || `r/${details.name}`}`
}

function mergeText(
  ...parts: Array<string | string[] | undefined | null>
): string | undefined {
  const unique: string[] = []

  for (const part of parts) {
    if (!part) {
      continue
    }

    const values = Array.isArray(part) ? part : [part]

    for (const value of values) {
      if (!value) {
        continue
      }

      const trimmed = `${value}`.trim()
      if (!trimmed) {
        continue
      }

      if (!unique.includes(trimmed)) {
        unique.push(trimmed)
      }
    }
  }

  if (!unique.length) {
    return undefined
  }

  return unique.join(" | ")
}

function formatNumber(value?: number): string {
  if (!value) {
    return "0"
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}m`
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`
  }

  return `${value}`
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}…`
}

function evaluateIntent(
  details: SubredditDetails,
  includeKeywords: string[],
  excludeKeywords: string[],
): IntentEvaluation {
  const haystack = sanitizeText(
    `${details.name} ${details.title} ${details.description} ${details.queries.join(" ")}`,
  ).toLowerCase()

  const includeMatches = matchKeywords(haystack, includeKeywords)
  const excludeMatches = matchKeywords(haystack, excludeKeywords)

  return {
    score: includeMatches.length,
    includeMatches,
    excludeMatches,
  }
}

function matchKeywords(haystack: string, keywords: string[]): string[] {
  const matches: string[] = []
  for (const keyword of keywords) {
    const needle = keyword.toLowerCase()
    if (!needle) {
      continue
    }

    const isWord = /^[a-z0-9]+$/i.test(needle)
    const pattern = isWord
      ? new RegExp(`\\b${escapeRegExp(needle)}\\b`, "i")
      : new RegExp(escapeRegExp(needle), "i")

    if (pattern.test(haystack)) {
      matches.push(keyword)
    }
  }

  return Array.from(new Set(matches))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function recordResult(result: DiscoveryResult) {
  if (!runContext) {
    return
  }

  const key = result.details.name.toLowerCase()
  runContext.processedNames.add(key)

  const index = runContext.results.findIndex(
    (entry) => entry.details.name.toLowerCase() === key,
  )

  if (index >= 0) {
    runContext.results[index] = result
  } else {
    runContext.results.push(result)
  }
}

function recordSkip(name: string, reason: string, statusCode?: number) {
  if (!runContext) {
    return
  }

  runContext.skips.push({ name, reason, statusCode })
}

async function handleInterrupt(signal: NodeJS.Signals) {
  if (handlingSignal) {
    console.log(`\nReceived ${signal} again. Forcing exit.`)
    process.exit(1)
  }

  handlingSignal = true
  console.log(`\nReceived ${signal}. Saving discovery progress...`)

  try {
    if (runContext) {
      const results = sortResults(runContext.results)
      await persistResults(results, runContext.outputPath, runContext.skips)
    } else {
      console.log("No active discovery run context found; nothing to save.")
    }
  } catch (error) {
    console.error("Failed to save discovery progress:", error)
  } finally {
    process.exit(0)
  }
}

function parseRedditError(error: unknown): {
  statusCode?: number
  reason?: string
  message?: string
} {
  if (!error || typeof error !== "object") {
    return {}
  }

  const anyError = error as any

  const statusCode: number | undefined = anyError.statusCode
  const body = anyError.error || anyError.body

  if (body && typeof body === "object") {
    return {
      statusCode,
      reason: body.reason || body.error,
      message: body.message,
    }
  }

  return {
    statusCode,
    message:
      typeof anyError.message === "string" ? anyError.message : undefined,
  }
}

async function processCandidate(
  candidate: Candidate,
  context: CandidateProcessingContext,
): Promise<DiscoveryResult | null> {
  const {
    args,
    includeKeywords,
    excludeKeywords,
    minIntentScore,
    targetProfile,
    cooldownMs,
  } = context

  const details = await fetchSubredditDetails(candidate)

  if (!details) {
    return null
  }

  const detailsKey = details.name.toLowerCase()
  if (runContext?.processedNames.has(detailsKey)) {
    if (!args.quiet) {
      console.log(`Skipping r/${details.name} (already processed).`)
    }
    recordSkip(details.name, "already processed")
    return null
  }

  if (!args.includeNsfw && details.over18) {
    if (!args.quiet) {
      console.log(`Skipping r/${details.name} (marked NSFW).`)
    }
    recordSkip(details.name, "marked NSFW")
    return null
  }

  if (details.subscribers < args.minSubscribers) {
    if (!args.quiet) {
      console.log(
        `Skipping r/${details.name} (${formatNumber(details.subscribers)} subscribers < minimum).`,
      )
    }
    recordSkip(
      details.name,
      `${formatNumber(details.subscribers)} subscribers < minimum`,
    )
    return null
  }

  const intent = evaluateIntent(details, includeKeywords, excludeKeywords)

  if (intent.excludeMatches.length) {
    if (!args.quiet) {
      console.log(
        `Skipping r/${details.name} (excluded keywords: ${intent.excludeMatches.join(", ")}).`,
      )
    }
    recordSkip(
      details.name,
      `excluded keywords: ${intent.excludeMatches.join(", ")}`,
    )
    return null
  }

  if (intent.score < minIntentScore) {
    if (!args.quiet) {
      console.log(
        `Skipping r/${details.name} (intent score ${intent.score} < ${minIntentScore}).`,
      )
    }
    recordSkip(details.name, `intent score ${intent.score} < ${minIntentScore}`)
    return null
  }

  const assessment = await assessSubreddit(
    details,
    args.model,
    targetProfile,
    intent,
    includeKeywords,
    excludeKeywords,
  )

  if (!assessment) {
    console.log(`Unable to score r/${details.name}; skipping.`)
    recordSkip(details.name, "OpenAI scoring failed")
    return null
  }

  const status = verdictToStatus(assessment.verdict)
  const configEntry = buildConfigEntry(details, assessment, intent)
  const result: DiscoveryResult = {
    details,
    assessment,
    status,
    configEntry,
    intent,
  }

  recordResult(result)
  displayResult(result)

  if (cooldownMs > 0) {
    await sleep(cooldownMs)
  }

  return result
}

async function seedRunContextFromExisting(context: RunContext): Promise<void> {
  try {
    const raw = await fs.readFile(context.outputPath, "utf-8")
    const parsed = JSON.parse(raw) as PersistedDocument

    const records = extractPersistedResults(parsed)
    const skipRecords = extractPersistedSkips(parsed)

    let added = 0

    for (const record of records) {
      const result = persistedRecordToResult(record)
      if (!result) {
        continue
      }

      const key = result.details.name.toLowerCase()
      if (context.processedNames.has(key)) {
        continue
      }

      context.processedNames.add(key)
      context.results.push(result)
      added += 1
    }

    if (skipRecords.length) {
      context.skips.push(...skipRecords)
    }

    if (added) {
      console.log(`Resuming with ${added} previously saved results.`)
    }
  } catch (error: any) {
    if (error && error.code === "ENOENT") {
      return
    }

    console.warn(
      `Unable to load existing discovery results from ${context.outputPath}:`,
      error,
    )
  }
}

function extractPersistedResults(parsed: PersistedDocument): PersistedResult[] {
  if (Array.isArray(parsed)) {
    return parsed as PersistedResult[]
  }

  if (parsed && typeof parsed === "object") {
    return Array.isArray(parsed.results) ? parsed.results : []
  }

  return []
}

function extractPersistedSkips(parsed: PersistedDocument): SkipRecord[] {
  if (Array.isArray(parsed)) {
    return []
  }

  if (parsed && typeof parsed === "object" && Array.isArray(parsed.skips)) {
    return parsed.skips
  }

  return []
}

function persistedRecordToResult(
  record: PersistedResult,
): DiscoveryResult | null {
  const name = sanitizeName(record.subreddit || record.details?.name)
  if (!name) {
    return null
  }

  const details: SubredditDetails = {
    name,
    title: record.details?.title || "",
    description: record.details?.description || "",
    subscribers: record.subscribers ?? record.details?.subscribers ?? 0,
    activeUserCount: record.details?.activeUserCount,
    over18: record.details?.over18,
    url: record.details?.url || `/r/${name}`,
    queries: record.queries || record.details?.queries || [],
    rules: record.details?.rules || [],
    siteRules: record.details?.siteRules || [],
  }

  const assessment: AiAssessment = record.assessment || {
    verdict: "manual_review",
    confidence: 0,
    summary: "Imported from saved results; review manually.",
  }

  const status: SubredditStatus =
    record.status || verdictToStatus(assessment.verdict)

  const configEntry: SubredditConfigEntry = record.configEntry || {
    name,
    intent: details.title || undefined,
  }

  const intent: IntentEvaluation = record.intent || {
    score: 0,
    includeMatches: [],
    excludeMatches: [],
  }

  return {
    details,
    assessment,
    status,
    configEntry,
    intent,
  }
}

function serializeResult(result: DiscoveryResult): PersistedResult {
  return {
    subreddit: result.details.name,
    status: result.status,
    assessment: result.assessment,
    configEntry: result.configEntry,
    subscribers: result.details.subscribers,
    queries: result.details.queries,
    intent: result.intent,
    details: {
      title: result.details.title,
      description: result.details.description,
      subscribers: result.details.subscribers,
      activeUserCount: result.details.activeUserCount,
      over18: result.details.over18,
      url: result.details.url,
      queries: result.details.queries,
    },
  }
}

function dedupeResultsByName(results: DiscoveryResult[]): DiscoveryResult[] {
  const map = new Map<string, DiscoveryResult>()
  for (const result of results) {
    map.set(result.details.name.toLowerCase(), result)
  }
  return Array.from(map.values())
}

function dedupeSkips(skips: SkipRecord[] = []): SkipRecord[] {
  const map = new Map<string, SkipRecord>()
  for (const skip of skips) {
    const key = `${skip.name.toLowerCase()}::${skip.reason}::${skip.statusCode ?? ""}`
    if (!map.has(key)) {
      map.set(key, skip)
    }
  }
  return Array.from(map.values())
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return []
  }

  const limit = Math.max(1, Math.floor(concurrency))
  let index = 0
  const results: R[] = []

  const runWorker = async () => {
    const localResults: R[] = []
    while (true) {
      const currentIndex = index
      if (currentIndex >= items.length) {
        break
      }
      index += 1
      const item = items[currentIndex]
      const value = await worker(item)
      localResults.push(value)
    }
    return localResults
  }

  const workers: Array<Promise<R[]>> = []
  for (let i = 0; i < limit; i += 1) {
    workers.push(runWorker())
  }

  const workerResults = await Promise.all(workers)
  for (const chunk of workerResults) {
    results.push(...chunk)
  }

  return results
}

function extractOutputText(data: any): string | null {
  const output = Array.isArray(data?.output)
    ? data.output.flatMap((segment: any) =>
        Array.isArray(segment?.content)
          ? segment.content
              .filter((chunk: any) => chunk?.type === "output_text")
              .map((chunk: any) => chunk?.text)
          : [],
      )
    : []

  const merged = output.filter(Boolean).join("\n").trim()
  return merged || null
}

function parseAssessmentJson(raw: string): AiAssessment | null {
  if (!raw) {
    return null
  }

  let cleaned = raw.trim()

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```[a-zA-Z0-9]*\s*/i, "")
      .replace(/```$/i, "")
      .trim()
  }

  const firstBrace = cleaned.indexOf("{")
  const lastBrace = cleaned.lastIndexOf("}")

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null
  }

  cleaned = cleaned.slice(firstBrace, lastBrace + 1)

  try {
    return JSON.parse(cleaned) as AiAssessment
  } catch (error) {
    console.error("Failed to parse cleaned OpenAI output:", error)
    return null
  }
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error("reddit-discovery failed:", error)
  process.exit(1)
})
