import dotenv from "dotenv"
import Snoowrap from "snoowrap"
import type {
  ListingOptions,
  SortedListingOptions,
} from "snoowrap/dist/objects/Listing"
import path from "node:path"
import { promises as fs } from "node:fs"
import { pathToFileURL } from "node:url"
import {
  DEFAULT_ALLOWED_FLAIRS,
  DEFAULT_CONFIG_FILE,
  DEFAULT_KEYWORDS,
  DEFAULT_DISCOVERY_TARGET_PROFILE,
  DEFAULT_DISCOVERY_INCLUDE_KEYWORDS,
  DEFAULT_DISCOVERY_EXCLUDE_KEYWORDS,
  DEFAULT_DISCOVERY_MIN_INTENT_SCORE,
  DEFAULT_DISCOVERY_SORTS,
  DEFAULT_DISCOVERY_TIME_FILTERS,
  DEFAULT_DISCOVERY_RESULTS_PER_QUERY,
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
  verbose: boolean
  minIntentScore?: number
  concurrency: number
  sorts: string[]
  timeFilters: SortedListingOptions["time"][]
  pages: number
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

export type SubredditDetails = {
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

const NSFW_KEYWORDS = [
  "nsfw",
  "nsfl",
  "porn",
  "pornography",
  "onlyfans",
  "only fans",
  "xxx",
  "sex work",
  "sexwork",
  "nude",
  "nudity",
  "18+",
  "18 plus",
  "adult content",
]

const SUPPORTED_TIME_FILTERS = [
  "hour",
  "day",
  "week",
  "month",
  "year",
  "all",
] as const satisfies ReadonlyArray<SortedListingOptions["time"]>

const SUPPORTED_TIME_FILTER_SET = new Set<SortedListingOptions["time"]>(
  SUPPORTED_TIME_FILTERS,
)

const DEFAULT_TIME_FILTER_FALLBACK: SortedListingOptions["time"] = "all"

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

type SearchTask = {
  query: string
  sort: string
  timeFilter?: SortedListingOptions["time"]
}

type ProgressBar = {
  update: (completed: number, label?: string) => void
  finish: () => void
}

type SubredditSearchOptions = ListingOptions & {
  query: string
  sort?: string
  include_over_18?: boolean
  time?: SortedListingOptions["time"]
}

type OptionTableRow = {
  label: string
  value: unknown
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
  const rawArgv = process.argv.slice(2)
  const args = parseArgs(rawArgv)
  const limitProvided = rawArgv.includes("--limit")
  const pagesProvided = rawArgv.includes("--pages")

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

  args.sorts = normalizeStringList(args.sorts)
  if (!args.sorts.length) {
    args.sorts = normalizeStringList(
      resolveStringList(
        null,
        discoveryConfig.sorts,
        DEFAULT_DISCOVERY_SORTS,
      ),
    )
  }

  if (!args.sorts.length) {
    args.sorts = ["relevance"]
  }

  const cliTimeFilters = args.timeFilters.length
    ? Array.from(new Set(args.timeFilters))
    : []

  const configuredTimeFilters = filterValidTimeFilters(
    normalizeStringList(
      resolveStringList(
        null,
        discoveryConfig.timeFilters,
        DEFAULT_DISCOVERY_TIME_FILTERS,
      ),
    ),
  )

  args.timeFilters = cliTimeFilters.length
    ? cliTimeFilters
    : configuredTimeFilters.length
      ? configuredTimeFilters
      : [DEFAULT_TIME_FILTER_FALLBACK]

  if (!limitProvided && typeof discoveryConfig.resultsPerQuery === "number") {
    const parsedResults = discoveryConfig.resultsPerQuery
    if (Number.isFinite(parsedResults) && parsedResults > 0) {
      args.limit = Math.floor(parsedResults)
    }
  }

  if (!pagesProvided) {
    const envPages = Number(process.env.REDDIT_DISCOVERY_PAGES)
    if (Number.isFinite(envPages) && envPages > 0) {
      args.pages = Math.floor(envPages)
    }
  }

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
  const fetchPerCombination = Math.max(
    1,
    Math.min(args.limit * Math.max(1, args.pages), 100),
  )
  const effectiveTimeFilters = args.sorts.some(sortRequiresTimeFilter)
    ? args.timeFilters
    : []

  console.log("")
  const tableWidth = printOptionTable(
    [
      { label: "Config file", value: configPath },
      { label: "Queries", value: queryList },
      { label: "Results/query", value: args.limit },
      { label: "Pages/query", value: args.pages },
      { label: "Min subscribers", value: formatNumber(args.minSubscribers) },
      { label: "Include NSFW", value: args.includeNsfw },
      { label: "Skip existing", value: args.skipExisting },
      { label: "Write config", value: args.write },
      { label: "Verbose", value: args.verbose },
      { label: "Intent match", value: includeKeywords },
      { label: "Intent deny", value: excludeKeywords },
      { label: "Min intent score", value: minIntentScore },
      { label: "Concurrency", value: concurrencyLimit },
      { label: "Cooldown (ms)", value: cooldownMs },
      { label: "Target ICP", value: targetProfile },
      { label: "Sorts", value: args.sorts },
      { label: "Top windows", value: effectiveTimeFilters.length ? effectiveTimeFilters : "(n/a)" },
      {
        label: "Fetch cap",
        value: `up to ${fetchPerCombination} results per query/sort combo (API cap 100)`,
      },
    ],
    { maxWidth: process.stdout.columns || 100 },
  )
  const fallbackWidth = process.stdout.columns || 100
  const dividerWidth = Math.max(
    10,
    Math.min(fallbackWidth, tableWidth || fallbackWidth),
  )
  if (dividerWidth > 0) {
    console.log("-".repeat(dividerWidth))
  }
  console.log("")

  const searchTasks: SearchTask[] = []
  for (const query of queryList) {
    for (const sort of args.sorts) {
      const timeTargets = sortRequiresTimeFilter(sort)
        ? effectiveTimeFilters
        : [undefined]

      for (const timeFilter of timeTargets) {
        searchTasks.push({ query, sort, timeFilter })
      }
    }
  }

  const candidateMap = new Map<string, Candidate>()
  const searchProgress =
    !args.verbose && searchTasks.length
      ? createProgressBar(searchTasks.length, "Collecting")
      : null

  let completedSearches = 0

  for (const task of searchTasks) {
    const paramsDescription = [
      `sort=${task.sort}`,
      task.timeFilter ? `time=${task.timeFilter}` : null,
    ]
      .filter(Boolean)
      .join(", ")

    if (args.verbose) {
      console.log(
        `\nSearching for subreddits matching "${task.query}" (${paramsDescription || "default"})...`,
      )
    } else {
      searchProgress?.update(
        completedSearches,
        `Searching ${task.query} (${paramsDescription || "default"})`,
      )
    }

    await collectCandidatesForQuery(
      reddit,
      candidateMap,
      task.query,
      task.sort,
      task.timeFilter,
      args,
      existingNames,
      fetchPerCombination,
    )

    completedSearches += 1

    if (args.verbose) {
      // no-op, verbose logs already printed inside collectCandidatesForQuery
    } else {
      searchProgress?.update(
        completedSearches,
        `Searching ${task.query} (${paramsDescription || "default"})`,
      )
    }

    await sleep(500)
  }

  searchProgress?.finish()

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

  const scoringProgress =
    !args.verbose && candidates.length
      ? createProgressBar(candidates.length, "Scoring")
      : null

  scoringProgress?.update(0, "Scoring candidate subreddits")

  const processedResults = await runWithConcurrency(
    candidates,
    concurrencyLimit,
    async (candidate) => processCandidate(candidate, processingContext),
    (completed, _total, candidate) => {
      if (args.verbose) {
        return
      }
      scoringProgress?.update(
        completed,
        `Scoring r/${candidate.name}`,
      )
    },
  )

  scoringProgress?.finish()

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
    limit: DEFAULT_DISCOVERY_RESULTS_PER_QUERY,
    minSubscribers: 500,
    includeNsfw: false,
    write: false,
    model:
      process.env.OPENAI_DISCOVERY_MODEL ||
      process.env.OPENAI_MODEL ||
      "gpt-4.1-mini",
    skipExisting: false,
    quiet: false,
    verbose: false,
    minIntentScore: undefined,
    concurrency: Number(process.env.REDDIT_DISCOVERY_CONCURRENCY || "3"),
    sorts: [],
    timeFilters: [],
    pages: (() => {
      const value = Number(process.env.REDDIT_DISCOVERY_PAGES || "1")
      if (!Number.isFinite(value) || value <= 0) {
        return 1
      }
      return Math.floor(value)
    })(),
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
      case "--sorts": {
        const value = argv[index + 1]
        if (!value) {
          throw new Error("--sorts expects a value")
        }
        index += 1
        const parts = value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
        result.sorts.push(...parts)
        break
      }
      case "--time-filters": {
        const value = argv[index + 1]
        if (!value) {
          throw new Error("--time-filters expects a value")
        }
        index += 1
        const rawParts = value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
        const normalized = normalizeStringList(rawParts)
        const valid = filterValidTimeFilters(normalized)
        result.timeFilters.push(...valid)
        break
      }
      case "--pages": {
        const value = Number(argv[index + 1])
        if (Number.isNaN(value) || value <= 0) {
          throw new Error("--pages expects a positive number")
        }
        result.pages = Math.floor(value)
        index += 1
        break
      }
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
      case "--verbose":
        result.verbose = true
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
  --limit                Max subreddits to fetch per query (default config or 60)
  --pages                Multipliers for --limit when fetching each query (default 1)
  --min-subscribers      Minimum subscriber count (default 500)
  --include-nsfw         Include NSFW communities
  --model                OpenAI model for rule analysis (default ENV or gpt-4.1-mini)
  --write                Persist suggested entries to the config file
  --skip-existing        Skip communities that already have a config entry
  --sorts                Comma-separated subreddit search sorts (default config)
  --time-filters         Comma-separated time filters for top-sort searches (default config)
  --min-intent-score     Minimum intent keyword matches before AI scoring (default config)
  --quiet                Suppress skip messages
  --verbose              Show detailed logs instead of progress bars
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
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function detectLikelyNsfw(details: SubredditDetails): string | null {
  const fields: Array<{ label: string; value?: string | null }> = [
    { label: "name", value: details.name },
    { label: "title", value: details.title },
    { label: "description", value: details.description },
  ]

  for (const field of fields) {
    if (!field.value) {
      continue
    }

    const normalized = sanitizeText(field.value).toLowerCase()
    if (!normalized) {
      continue
    }

    for (const keyword of NSFW_KEYWORDS) {
      if (normalized.includes(keyword)) {
        return `likely NSFW: ${field.label} contains "${keyword}"`
      }
    }
  }

  return null
}

function normalizeStringList(values: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const value of values) {
    if (!value) {
      continue
    }

    const lowered = value.toLowerCase().trim()
    if (!lowered || seen.has(lowered)) {
      continue
    }

    seen.add(lowered)
    normalized.push(lowered)
  }

  return normalized
}

function filterValidTimeFilters(
  values: string[],
): SortedListingOptions["time"][] {
  const filtered: SortedListingOptions["time"][] = []

  for (const value of values) {
    const candidate = value as SortedListingOptions["time"]
    if (
      SUPPORTED_TIME_FILTER_SET.has(candidate) &&
      !filtered.includes(candidate)
    ) {
      filtered.push(candidate)
    }
  }

  return filtered
}

function sortRequiresTimeFilter(sort: string): boolean {
  const normalized = sort.toLowerCase()
  return normalized === "top" || normalized === "controversial"
}

function createProgressBar(total: number, prefix = "Progress"): ProgressBar {
  const maxTotal = Math.max(0, total)
  if (maxTotal === 0) {
    return {
      update: () => {},
      finish: () => {},
    }
  }

  if (!process.stderr.isTTY) {
    let lastPercent = -1
    const base = prefix ? `${prefix}: ` : ""

    return {
      update: (completed, label) => {
        const ratio = Math.min(1, Math.max(0, completed / maxTotal))
        const percent = Math.round(ratio * 100)
        if (percent === lastPercent) {
          return
        }
        lastPercent = percent
        const suffix = label ? ` ${label}` : ""
        console.log(`${base}${percent}%${suffix}`)
      },
      finish: () => {
        if (lastPercent !== 100) {
          console.log(`${base}100%`)
        }
      },
    }
  }

  let renderedLength = 0
  let lastLabel = ""
  const columns = typeof process.stderr.columns === "number"
    ? process.stderr.columns
    : 80
  const barWidth = Math.min(40, Math.max(10, Math.floor(columns * 0.4)))
  const basePrefix = prefix ? `${prefix} ` : ""

  const render = (completed: number, label?: string) => {
    if (label) {
      lastLabel = label
    }

    const ratio = Math.min(1, Math.max(0, completed / maxTotal))
    const percent = Math.round(ratio * 100)
    const filled = Math.round(barWidth * ratio)
    const empty = barWidth - filled
    const bar = `${"#".repeat(filled)}${"-".repeat(empty)}`
    const percentText = `${percent}`.padStart(3, " ")
    const composed = `${basePrefix}[${bar}] ${percentText}% ${lastLabel}`.trimEnd()
    const maxLen = (process.stderr.columns || columns) - 1
    const truncated = composed.length > maxLen
      ? composed.slice(0, Math.max(0, maxLen))
      : composed
    const padding = Math.max(0, renderedLength - truncated.length)
    process.stderr.write(`\r${truncated}${" ".repeat(padding)}`)
    renderedLength = truncated.length
  }

  return {
    update: (completed, label) => {
      render(completed, label)
    },
    finish: () => {
      render(maxTotal)
      process.stderr.write("\n")
    },
  }
}

type OptionTableOptions = {
  maxWidth?: number
  labelWidth?: number
}

function formatOptionValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "(not set)"
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no"
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "(none)"
  }

  return `${value}`
}

function truncateValue(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  if (maxLength <= 1) {
    return value.slice(0, Math.max(0, maxLength))
  }

  return `${value.slice(0, maxLength - 1)}…`
}

function printOptionTable(
  rows: OptionTableRow[],
  options: OptionTableOptions = {},
): number {
  if (!rows.length) {
    return 0
  }

  const normalizedRows = rows.map((row) => ({
    label: row.label.trim(),
    value: formatOptionValue(row.value),
  }))

  const headerLabel = "Option"
  const headerValue = "Value"
  const configuredLabelWidth = options.labelWidth || headerLabel.length
  const labelWidth = Math.max(
    configuredLabelWidth,
    ...normalizedRows.map((row) => row.label.length),
  )

  const rawValueWidth = Math.max(
    headerValue.length,
    ...normalizedRows.map((row) => row.value.length),
  )

  const terminalWidth = typeof process.stdout.columns === "number"
    ? process.stdout.columns
    : undefined
  const maxWidth = options.maxWidth || terminalWidth || 100
  const gutter = 5 // " | " separation
  const tableWidth = Math.min(maxWidth, labelWidth + gutter + rawValueWidth + 4)
  const adjustedValueWidth = Math.max(
    10,
    tableWidth - (labelWidth + gutter + 4),
  )

  const divider = `+${"-".repeat(labelWidth + 2)}+${"-".repeat(adjustedValueWidth + 2)}+`
  console.log(divider)
  console.log(
    `| ${headerLabel.padEnd(labelWidth)} | ${headerValue.padEnd(adjustedValueWidth)} |`,
  )
  console.log(divider)

  for (const row of normalizedRows) {
    const value = truncateValue(row.value, adjustedValueWidth)
    console.log(
      `| ${row.label.padEnd(labelWidth)} | ${value.padEnd(adjustedValueWidth)} |`,
    )
  }

  console.log(divider)

  return divider.length
}

async function collectCandidatesForQuery(
  reddit: Snoowrap,
  candidateMap: Map<string, Candidate>,
  query: string,
  sort: string,
  timeFilter: SortedListingOptions["time"] | undefined,
  args: DiscoveryArgs,
  existingNames: Set<string>,
  limit: number,
): Promise<number> {
  const searchParams: SubredditSearchOptions = {
    query,
    limit,
    sort,
  }

  if (args.includeNsfw) {
    searchParams.include_over_18 = true
  }

  if (timeFilter) {
    searchParams.time = timeFilter
  }

  try {
    const listing = (await reddit.searchSubreddits(searchParams)) as any
    const results = Array.from(listing as any[]).slice(0, limit)
    let added = 0

    for (const sub of results) {
      if (
        addCandidateFromListing(
          sub,
          query,
          args,
          candidateMap,
          existingNames,
        )
      ) {
        added += 1
      }
    }

    if (!args.quiet && args.verbose) {
      console.log(
        `  -> Found ${added} new candidate(s) (total ${candidateMap.size}).`,
      )
    }

    return added
  } catch (error) {
    const timePart = timeFilter ? `, time=${timeFilter}` : ""
    console.warn(
      `Warning: failed to search subreddits for "${query}" (sort=${sort}${timePart}).`,
      error,
    )
    return 0
  }
}

function addCandidateFromListing(
  subreddit: any,
  query: string,
  args: DiscoveryArgs,
  candidateMap: Map<string, Candidate>,
  existingNames: Set<string>,
): boolean {
  const name = sanitizeName(
    subreddit.display_name || subreddit.display_name_prefixed,
  )

  if (!name) {
    return false
  }

  const key = name.toLowerCase()

  if (args.skipExisting && existingNames.has(key)) {
    if (args.verbose && !args.quiet) {
      console.log(`Skipping r/${name} (already in config).`)
    }
    recordSkip(name, "already in config")
    return false
  }

  if (runContext?.processedNames.has(key)) {
    if (args.verbose && !args.quiet) {
      console.log(`Skipping r/${name} (already processed in previous run).`)
    }
    recordSkip(name, "already processed")
    return false
  }

  const existing = candidateMap.get(key)
  if (existing) {
    existing.queries.add(query)
    return false
  }

  candidateMap.set(key, {
    name,
    queries: new Set([query]),
    subreddit,
  })

  return true
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
    if (args.verbose && !args.quiet) {
      console.log(`Skipping r/${details.name} (already processed).`)
    }
    recordSkip(details.name, "already processed")
    return null
  }

  if (!args.includeNsfw && details.over18) {
    if (args.verbose && !args.quiet) {
      console.log(`Skipping r/${details.name} (marked NSFW).`)
    }
    recordSkip(details.name, "marked NSFW")
    return null
  }

  if (!args.includeNsfw) {
    const nsfwSignal = detectLikelyNsfw(details)
    if (nsfwSignal) {
      if (args.verbose && !args.quiet) {
        console.log(`Skipping r/${details.name} (${nsfwSignal}).`)
      }
      recordSkip(details.name, nsfwSignal)
      return null
    }
  }

  if (details.subscribers < args.minSubscribers) {
    if (args.verbose && !args.quiet) {
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
    if (args.verbose && !args.quiet) {
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
    if (args.verbose && !args.quiet) {
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
  onProgress?: (completed: number, total: number, item: T) => void,
): Promise<R[]> {
  if (items.length === 0) {
    return []
  }

  const limit = Math.max(1, Math.floor(concurrency))
  let index = 0
  let completed = 0
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
      completed += 1
      if (onProgress) {
        onProgress(completed, items.length, item)
      }
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

const cliEntry = process.argv[1] ? path.resolve(process.argv[1]) : null
const isDirectExecution =
  cliEntry && pathToFileURL(cliEntry).href === import.meta.url

if (isDirectExecution) {
  main().catch((error) => {
    console.error("reddit-discovery failed:", error)
    process.exit(1)
  })
}

export { detectLikelyNsfw, sanitizeText }
