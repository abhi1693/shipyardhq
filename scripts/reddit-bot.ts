import dotenv from "dotenv"
import Snoowrap from "snoowrap"
import path from "node:path"
import { promises as fs } from "node:fs"
import readline from "node:readline"
import {
  DEFAULT_ALLOWED_FLAIRS,
  DEFAULT_CONFIG_FILE,
  DEFAULT_KEYWORDS,
  DEFAULT_SUBREDDITS,
  LoadedFileConfig,
  SubredditConfigEntry,
  categorizeSubreddits,
  loadBotFileConfig,
  parseList,
  resolveStringList,
} from "../lib/reddit/config"

dotenv.config()
dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
  override: false,
})

type Decision = "approved" | "skipped"

type ApprovalChoice = "y" | "n" | "r"

type MinimalSubmission = {
  id: string
  permalink: string
  author?: { name?: string | null } | null
  subreddit: { display_name: string }
  ups: number
  selftext?: string | null
  title: string
  link_flair_text?: string | null
  created_utc?: number
  reply: (content: string) => Promise<unknown>
}

type BotStateEntry = {
  decision: Decision
  permalink: string
  processedAt: string
  title?: string
  subreddit?: string
  flair?: string | null
  keywords?: string[]
  topicSignature?: string | null
  skipReason?: string
  skipSummary?: SkipSummary
}

type BotState = Record<string, BotStateEntry>

type SubmissionDescriptor = {
  keywords: string[]
  topicSignature: string | null
}

type RecordDecisionOptions = {
  descriptor?: SubmissionDescriptor
  reason?: string
  source?: "auto" | "manual"
  skipKnowledge?: boolean
  skipSummary?: SkipSummary | null
}

type Config = {
  redditClientId: string
  redditClientSecret: string
  redditUsername: string
  redditPassword: string
  userAgent: string
  openAIApiKey: string
  openAIModel: string
  subreddits: string[]
  subredditConfigs: SubredditConfigEntry[]
  reviewSubreddits: string[]
  deniedSubreddits: string[]
  keywords: string[]
  allowedFlairs: string[]
  pollIntervalMs: number
  maxPostAgeMinutes: number
  maxPostsPerSubreddit: number
  stateFile: string
  minUpvotes: number
  requestDelayMs: number
  maxDraftTokens: number
  temperature: number
  skipLogFile: string
}

type SkipSummaryMetrics = {
  wordCount?: number
  linkCount?: number
  upvotes?: number
  launchStage?: string
  audience?: string
  sentiment?: string
}

type SkipSummary = {
  summary: string
  intent: string
  metrics?: SkipSummaryMetrics
  raw?: unknown
}

type SkipLogEntry = {
  id: string
  permalink: string
  subreddit: string
  title: string
  skippedAt: string
  source: "auto" | "manual"
  reason?: string
  keywords?: string[]
  topicSignature?: string | null
  summary?: string
  intent?: string
  metrics?: SkipSummaryMetrics
}

type SkipLogOptions = {
  descriptor: SubmissionDescriptor
  reason?: string
  summary?: SkipSummary | null
  source: "auto" | "manual"
}

const fileConfig: LoadedFileConfig = loadBotFileConfig(
  process.env.REDDIT_CONFIG_FILE || DEFAULT_CONFIG_FILE,
)

const {
  ready: readySubreddits,
  review: reviewSubreddits,
  deny: deniedSubreddits,
} = categorizeSubreddits(fileConfig.subreddits || [])

const subredditConfigMap = new Map(
  (fileConfig.subreddits || []).map((entry) => [
    entry.name.toLowerCase(),
    entry,
  ]),
)

const envSubreddits = parseList(process.env.REDDIT_SUBREDDITS)

const config: Config = {
  redditClientId: requireEnv("REDDIT_CLIENT_ID"),
  redditClientSecret: requireEnv("REDDIT_CLIENT_SECRET"),
  redditUsername: requireEnv("REDDIT_USERNAME"),
  redditPassword: requireEnv("REDDIT_PASSWORD"),
  userAgent:
    process.env.REDDIT_USER_AGENT ||
    "shipyardhq-reddit-bot/1.0 (+https://shipyardhq.dev)",
  openAIApiKey: requireEnv("OPENAI_API_KEY"),
  openAIModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  subreddits: resolveStringList(
    envSubreddits,
    readySubreddits.map((entry) => entry.name),
    DEFAULT_SUBREDDITS,
  ),
  subredditConfigs: fileConfig.subreddits || [],
  reviewSubreddits: reviewSubreddits.map((entry) => entry.name),
  deniedSubreddits: deniedSubreddits.map((entry) => entry.name),
  keywords: resolveStringList(
    parseList(process.env.REDDIT_KEYWORDS),
    fileConfig.keywords,
    DEFAULT_KEYWORDS,
  ).map((word) => word.toLowerCase()),
  allowedFlairs: resolveStringList(
    parseList(process.env.REDDIT_ALLOWED_FLAIRS),
    fileConfig.allowedFlairs,
    DEFAULT_ALLOWED_FLAIRS,
  ).map((flair) => flair.toLowerCase()),
  pollIntervalMs:
    parseInt(process.env.REDDIT_POLL_INTERVAL_SECONDS || "300", 10) * 1000,
  maxPostAgeMinutes: parseInt(
    process.env.REDDIT_MAX_POST_AGE_MINUTES || "720",
    10,
  ),
  maxPostsPerSubreddit: parseInt(
    process.env.REDDIT_MAX_POSTS_PER_SUB || "25",
    10,
  ),
  stateFile:
    process.env.REDDIT_STATE_FILE ||
    path.join(process.cwd(), "tmp", "reddit-bot-state.json"),
  minUpvotes: parseInt(process.env.REDDIT_MIN_UPVOTES || "0", 10),
  requestDelayMs: parseInt(process.env.REDDIT_REQUEST_DELAY_MS || "1100", 10),
  maxDraftTokens: parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS || "220", 10),
  temperature: Number(process.env.OPENAI_TEMPERATURE || "0.7"),
  skipLogFile:
    process.env.REDDIT_SKIP_LOG_FILE ||
    path.join(process.cwd(), "tmp", "reddit-bot-skips.json"),
}

const STOP_WORDS = new Set([
  "able",
  "about",
  "across",
  "after",
  "again",
  "against",
  "almost",
  "also",
  "amid",
  "and",
  "another",
  "any",
  "around",
  "because",
  "been",
  "being",
  "between",
  "both",
  "bring",
  "cannot",
  "come",
  "could",
  "daily",
  "does",
  "doing",
  "down",
  "during",
  "each",
  "even",
  "every",
  "first",
  "for",
  "from",
  "going",
  "good",
  "have",
  "help",
  "helps",
  "here",
  "however",
  "into",
  "its",
  "just",
  "keep",
  "like",
  "made",
  "make",
  "many",
  "more",
  "most",
  "much",
  "need",
  "needs",
  "only",
  "onto",
  "other",
  "our",
  "ours",
  "over",
  "own",
  "per",
  "really",
  "same",
  "since",
  "some",
  "still",
  "such",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "thing",
  "think",
  "this",
  "those",
  "through",
  "under",
  "until",
  "upon",
  "use",
  "used",
  "using",
  "very",
  "want",
  "well",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "within",
  "would",
  "you",
  "your",
  "yours",
  "https",
  "http",
  "shipyard",
])

const skipKeywordCounts = new Map<string, number>()
const skipSignatureCounts = new Map<string, number>()
const skipLog: SkipLogEntry[] = []

const reddit = new Snoowrap({
  userAgent: config.userAgent,
  clientId: config.redditClientId,
  clientSecret: config.redditClientSecret,
  username: config.redditUsername,
  password: config.redditPassword,
})

reddit.config({ requestDelay: config.requestDelayMs, warnings: false })

const state: BotState = {}

const recentReplies: string[] = []

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

process.on("SIGINT", async () => {
  await saveState(config.stateFile, state)
  rl.close()
  console.log("\nState saved. Exiting.")
  process.exit(0)
})

async function main() {
  console.log("Starting ShipyardHQ Reddit outreach bot.")
  console.log(`Config file: ${fileConfig.path || "(none)"}`)
  console.log(`Monitoring subreddits: ${config.subreddits.join(", ")}`)
  if (config.reviewSubreddits.length) {
    console.log(`Review needed: ${config.reviewSubreddits.join(", ")}`)
  }
  if (config.deniedSubreddits.length) {
    console.log(`Denied in config: ${config.deniedSubreddits.join(", ")}`)
  }
  console.log(`Keywords: ${config.keywords.join(", ")}`)
  console.log(`Allowed flairs: ${config.allowedFlairs.join(", ")}`)
  console.log(`Polling every ${config.pollIntervalMs / 1000}s`)

  const loadedState = await loadState(config.stateFile)
  Object.assign(state, loadedState)
  rebuildSkipKnowledge()
  const processedCount = Object.keys(state).length
  console.log(`Loaded ${processedCount} previously processed posts.`)
  const skipSummary = summarizeSkipKnowledge()
  if (skipSummary) {
    console.log(skipSummary)
  }
  await loadSkipLog(config.skipLogFile)
  if (skipLog.length) {
    console.log(
      `Skip log entries available for review: ${skipLog.length} (use npm run reddit:skips).`,
    )
  }

  while (true) {
    const subredditOrder = shuffle(config.subreddits)

    for (const subredditName of subredditOrder) {
      try {
        await processSubreddit(subredditName)
      } catch (error) {
        console.error(`Error while processing r/${subredditName}:`, error)
      }
    }

    await saveState(config.stateFile, state)
    await waitForNextPoll(config.pollIntervalMs)
  }
}

async function processSubreddit(subredditName: string) {
  const submissions = (await reddit.getSubreddit(subredditName).getNew({
    limit: config.maxPostsPerSubreddit,
  })) as unknown as MinimalSubmission[]

  for (const submission of submissions) {
    if (!isRelevant(submission)) {
      continue
    }

    if (state[submission.id]) {
      continue
    }

    const descriptor = describeSubmission(submission)

    const alreadyReplied = await hasExistingBotComment(submission)
    if (alreadyReplied) {
      const permalink =
        buildPermalink(submission.permalink) ||
        (submission.permalink
          ? `https://reddit.com${submission.permalink}`
          : "")
      console.log(
        `\n⏭️ Auto-skipped ${permalink} (existing comment by u/${config.redditUsername})`,
      )
      recordProcessedSubmission(submission, "skipped", {
        descriptor,
        reason: `existing comment by u/${config.redditUsername}`,
        source: "auto",
        skipKnowledge: false,
      })
      await appendSkipLog(submission, {
        descriptor,
        reason: `existing comment by u/${config.redditUsername}`,
        summary: null,
        source: "auto",
      })
      await saveState(config.stateFile, state)
      continue
    }

    const similarityNotice = describeSkipSimilarity(descriptor)
    if (similarityNotice) {
      console.log(
        `\nℹ️ Related to previously skipped topics: ${similarityNotice}`,
      )
    }

    const previousDrafts: string[] = []
    const seedAvoid = [...recentReplies.slice(-8)]
    let draft = await draftReply(submission, {
      avoid: [...previousDrafts, ...seedAvoid],
    })

    if (!draft) {
      continue
    }

    let decision: Decision | null = null
    let skipReason: string | undefined
    let manualSkipSummary: SkipSummary | null = null

    for (;;) {
      const choice = await requestApproval(submission, draft)

      if (choice === "y") {
        try {
          await submission.reply(draft)
          console.log(`
✅ Replied to https://reddit.com${submission.permalink}`)
          decision = "approved"
          const trimmed = draft.trim()
          if (trimmed) {
            const cleaned = sanitize(trimmed)
            recentReplies.push(cleaned)
            if (recentReplies.length > 12) {
              recentReplies.splice(0, recentReplies.length - 12)
            }
          }
        } catch (error) {
          console.error("Failed to post reply:", error)
          console.log(`
⏭️ Skipped https://reddit.com${submission.permalink}`)
          decision = "skipped"
          skipReason = "reply failed"
        }
        break
      }

      if (choice === "n") {
        console.log(`
⏭️ Skipped https://reddit.com${submission.permalink}`)
        decision = "skipped"
        skipReason = "manual skip"
        manualSkipSummary = await summarizeSkippedPost(submission)
        break
      }

      console.log(`
🔁 Regenerating draft...`)
      const trimmedCurrent = draft.trim()
      if (trimmedCurrent) {
        previousDrafts.push(trimmedCurrent)
      }
      const nextDraft = await draftReply(submission, {
        avoid: [...previousDrafts, ...recentReplies.slice(-8)],
      })

      if (!nextDraft) {
        console.log("⚠️ Unable to regenerate draft. Skipping this post.")
        decision = "skipped"
        skipReason = "draft regeneration failed"
        break
      }

      draft = nextDraft
    }

    if (!decision) {
      continue
    }

    if (decision === "skipped" && !manualSkipSummary) {
      manualSkipSummary = await summarizeSkippedPost(submission)
    }

    if (decision === "skipped" && manualSkipSummary) {
      printSkipSummary(submission, manualSkipSummary)
    }

    recordProcessedSubmission(submission, decision, {
      descriptor,
      reason: skipReason,
      source: "manual",
      skipSummary: manualSkipSummary,
    })

    if (decision === "skipped") {
      await appendSkipLog(submission, {
        descriptor,
        reason: skipReason,
        summary: manualSkipSummary,
        source: "manual",
      })
    }
    await saveState(config.stateFile, state)
  }
}

type DraftOptions = {
  avoid?: string[]
}

async function draftReply(
  submission: MinimalSubmission,
  options: DraftOptions = {},
): Promise<string | null> {
  const bodyPreview = sanitize((submission.selftext || "").trim()).slice(
    0,
    1200,
  )

  const guidance = buildSubredditGuidance(submission.subreddit.display_name)

  const avoidedSet = new Set((options.avoid || []).map((text) => text.trim()))
  const avoidedPhrases = Array.from(avoidedSet)
    .map((text) => sanitize(text).slice(0, 160))
    .filter(Boolean)

  const avoidGuidance = avoidedPhrases.length
    ? `\n\nYou have previously drafted replies. The new response must feel fresh and may not reuse distinctive phrasing, sentences, cadence, or structure from these earlier drafts: ${avoidedPhrases.join(" | ")}. Switch up openings, vary sentence length, and change how you mention Shipyard.`
    : ""

  const systemText =
    "You are a concise, friendly founder from Shipyard HQ, an early-stage directory where builders share their launches. Draft a short (<=80 words) encouraging reply to founders showcasing their product on Reddit. Each reply must feel bespoke—reference specific details from their product or problem, and vary your tone, sentence structure, and CTA wording every time. Mention that listing on Shipyard is free, takes roughly 30 seconds, and publishes immediately with no queues or paid slots, but acknowledge that the community is still growing and you're inviting them to be part of the first wave. Always include the https://shipyardhq.dev URL somewhere natural in the reply. Offer help if they have questions and keep a sincere founder-to-founder tone without sounding spammy or formulaic." +
    (guidance
      ? `\n\nCommunity guidance for r/${submission.subreddit.display_name}:\n${guidance}`
      : "") +
    avoidGuidance

  const maxTokens = clamp(config.maxDraftTokens, 64, 512)
  const baseTemperature = clamp(config.temperature, 0, 2)
  const variedTemperature = clamp(
    baseTemperature + Math.min(0.4, avoidedPhrases.length * 0.18),
    0,
    2,
  )

  const payload = {
    model: config.openAIModel,
    store: false,
    parallel_tool_calls: false,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: systemText,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Subreddit: r/${submission.subreddit.display_name}
Title: ${sanitize(submission.title)}
Author: ${submission.author?.name ? "u/" + submission.author.name : "unknown"}
Post Body:
${bodyPreview}

 Key requirements:
- weave in at least one concrete detail from the title or body so the author knows you read their post.
- restate Shipyard's benefits in your own words (free listing, ~30 second launch, instant publishing, no queues/paid slots) with varied phrasing, be honest that we're early and looking for first adopters, and include https://shipyardhq.dev once.
- offer help or encouragement in a way that matches the product's vibe.
- keep the reply under 80 words and avoid bullet points.
- do not repeat wording from earlier drafts listed above.`,
          },
        ],
      },
    ],
    max_output_tokens: maxTokens,
    temperature: variedTemperature,
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openAIApiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI API error:", errorText)
      return null
    }

    const data = await response.json()

    const outputSegments = Array.isArray(data.output)
      ? data.output.flatMap((segment: any) =>
          Array.isArray(segment?.content)
            ? segment.content.filter(
                (chunk: any) => chunk?.type === "output_text",
              )
            : [],
        )
      : []

    const draft = outputSegments
      .map((chunk: any) => chunk?.text)
      .filter(Boolean)
      .join("\n")
      .trim()

    if (!draft) {
      console.error("OpenAI API returned no draft.")
      return null
    }

    return draft
  } catch (error) {
    console.error("Failed to call OpenAI API:", error)
    return null
  }
}

async function requestApproval(
  submission: MinimalSubmission,
  draft: string,
): Promise<ApprovalChoice> {
  const url = `https://reddit.com${submission.permalink}`
  const author = submission.author?.name
    ? `u/${submission.author.name}`
    : "unknown"
  const createdUtc = submission.created_utc ?? Date.now() / 1000
  const createdAt = new Date(createdUtc * 1000).toLocaleString()
  const body = submission.selftext || ""

  console.log("\n────────────────────────────────────────────────────")
  console.log(`Subreddit : r/${submission.subreddit.display_name}`)
  console.log(`Author    : ${author}`)
  console.log(`Created   : ${createdAt}`)
  console.log(`Upvotes   : ${submission.ups}`)
  console.log(`Url       : ${url}`)
  console.log(`Title     : ${submission.title}`)
  if (body.trim()) {
    console.log("\nPost Body:")
    console.log(body)
  }
  console.log("\nDraft Reply:")
  console.log(draft)

  while (true) {
    const answer = await ask(
      "\nReply with this draft? (y = post, n = skip, r = regenerate, enter = skip) ",
    )

    if (answer === "") {
      console.log("Skipping by default (no input).")
      return "n"
    }

    if (answer === "y" || answer === "n" || answer === "r") {
      return answer
    }

    console.log("Please enter y, n, or r (or press enter to skip).")
  }
}

function isRelevant(submission: MinimalSubmission) {
  if (!submission || submission.author?.name === "[deleted]") {
    return false
  }

  const createdAt = submission.created_utc
    ? submission.created_utc * 1000
    : Date.now()
  const ageMinutes = (Date.now() - createdAt) / 60000
  if (ageMinutes > config.maxPostAgeMinutes) {
    return false
  }

  if (submission.ups < config.minUpvotes) {
    return false
  }

  const flair = submission.link_flair_text
    ? sanitize(submission.link_flair_text).toLowerCase()
    : null
  const matchesAllowedFlair = flair
    ? config.allowedFlairs.some((allowed) => flair.includes(allowed))
    : false

  if (flair && !matchesAllowedFlair) {
    return false
  }

  if (matchesAllowedFlair) {
    return true
  }

  const haystack =
    `${submission.title} ${submission.selftext || ""}`.toLowerCase()
  const hasKeyword = config.keywords.some((keyword) =>
    haystack.includes(keyword),
  )

  return hasKeyword
}

function describeSubmission(
  submission: MinimalSubmission,
): SubmissionDescriptor {
  const keywords = extractKeywords(submission)
  return {
    keywords,
    topicSignature: buildTopicSignature(keywords),
  }
}

function describeSkipSimilarity(
  descriptor: SubmissionDescriptor,
): string | null {
  if (!descriptor.keywords.length && !descriptor.topicSignature) {
    return null
  }

  const matchedKeywords = descriptor.keywords
    .map((keyword) => ({ keyword, count: skipKeywordCounts.get(keyword) || 0 }))
    .filter(({ count }) => count > 0)

  const highlightKeywords = matchedKeywords
    .filter(({ count }) => count >= 1)
    .slice(0, 4)

  const strongMatches = matchedKeywords.filter(({ count }) => count >= 2)

  const signatureMatches = descriptor.topicSignature
    ? skipSignatureCounts.get(descriptor.topicSignature) || 0
    : 0

  const reasons: string[] = []

  if (signatureMatches >= 2) {
    reasons.push(`topic signature seen in ${signatureMatches} prior skips`)
  } else if (signatureMatches === 1) {
    reasons.push("topic signature previously skipped once")
  }

  if (strongMatches.length >= 1) {
    const summary = strongMatches
      .slice(0, 3)
      .map(({ keyword, count }) => `${keyword} (${count})`)
      .join(", ")
    reasons.push(`keywords skipped often: ${summary}`)
  } else if (highlightKeywords.length >= 3) {
    const summary = highlightKeywords.map(({ keyword }) => keyword).join(", ")
    reasons.push(`shares keywords with skips: ${summary}`)
  }

  if (!reasons.length) {
    return null
  }

  return reasons.join("; ")
}

function recordProcessedSubmission(
  submission: MinimalSubmission,
  decision: Decision,
  options: RecordDecisionOptions = {},
) {
  const {
    descriptor = describeSubmission(submission),
    reason,
    source,
    skipKnowledge = true,
    skipSummary = null,
  } = options

  const permalink =
    buildPermalink(submission.permalink) ||
    (submission.permalink ? `https://reddit.com${submission.permalink}` : "")

  const entry: BotStateEntry = {
    decision,
    permalink,
    processedAt: new Date().toISOString(),
    title: sanitize(submission.title),
    subreddit: submission.subreddit.display_name,
    flair: submission.link_flair_text
      ? sanitize(submission.link_flair_text)
      : null,
  }

  if (descriptor.keywords.length) {
    entry.keywords = descriptor.keywords
  }

  if (descriptor.topicSignature) {
    entry.topicSignature = descriptor.topicSignature
  }

  if (decision === "skipped" && reason) {
    entry.skipReason = `${source === "auto" ? "auto" : "manual"}: ${reason}`
  }

  if (decision === "skipped" && skipSummary) {
    entry.skipSummary = skipSummary
  }

  state[submission.id] = entry

  if (decision === "skipped" && skipKnowledge) {
    registerSkipKnowledge(entry)
  }
}

function registerSkipKnowledge(entry: BotStateEntry) {
  if (entry.decision !== "skipped") {
    return
  }

  let keywords = Array.isArray(entry.keywords) ? entry.keywords : []

  if (!keywords.length) {
    keywords = extractKeywordsFromParts([entry.title, entry.flair || undefined])
  }

  const uniqueKeywords = new Set<string>(keywords)
  for (const keyword of uniqueKeywords) {
    if (!keyword) {
      continue
    }
    const lower = keyword.toLowerCase()
    skipKeywordCounts.set(lower, (skipKeywordCounts.get(lower) || 0) + 1)
  }

  const signature =
    entry.topicSignature ||
    (keywords.length ? buildTopicSignature(keywords) : null)
  if (signature) {
    skipSignatureCounts.set(
      signature,
      (skipSignatureCounts.get(signature) || 0) + 1,
    )
  }
}

function rebuildSkipKnowledge() {
  skipKeywordCounts.clear()
  skipSignatureCounts.clear()

  for (const entry of Object.values(state)) {
    registerSkipKnowledge(entry)
  }
}

function summarizeSkipKnowledge(): string | null {
  const skippedCount = Object.values(state).filter(
    (entry) => entry.decision === "skipped",
  ).length

  if (!skippedCount) {
    return null
  }

  const topKeywords = [...skipKeywordCounts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const keywordSummary = topKeywords.length
    ? ` Top skipped keywords: ${topKeywords
        .map(({ keyword, count }) => `${keyword} (${count})`)
        .join(", ")}.`
    : ""

  return `Skip history: ${skippedCount} skipped posts tracked.${keywordSummary}`
}

async function hasExistingBotComment(
  submission: MinimalSubmission,
): Promise<boolean> {
  const username = config.redditUsername?.toLowerCase()
  if (!username) {
    return false
  }

  try {
    const redditSubmission = reddit.getSubmission(submission.id)
    const commentsListing: any = redditSubmission.comments

    let rawComments: any[] | null = null

    if (commentsListing && typeof commentsListing.fetchAll === "function") {
      rawComments = await commentsListing.fetchAll({
        amount: 120,
        skipReplies: true,
      })
    } else if (
      commentsListing &&
      typeof commentsListing.fetchMore === "function"
    ) {
      rawComments = await commentsListing.fetchMore({
        amount: 120,
        skipReplies: true,
      })
    } else {
      const expanded = await redditSubmission.expandReplies({
        limit: 120,
        depth: 1,
      })
      const expandedComments: any = expanded?.comments
      rawComments = Array.isArray(expandedComments) ? expandedComments : null
    }

    if (!rawComments || !Array.isArray(rawComments)) {
      return false
    }

    for (const comment of rawComments) {
      if (!comment || typeof comment !== "object") {
        continue
      }

      const authorName =
        typeof comment.author?.name === "string"
          ? comment.author.name.toLowerCase()
          : typeof comment.author === "string"
            ? comment.author.toLowerCase()
            : null

      if (!authorName) {
        continue
      }

      if (authorName === username) {
        return true
      }
    }
  } catch (error) {
    console.warn(
      `Failed to inspect existing comments for submission ${submission.id}:`,
      error,
    )
  }

  return false
}

async function summarizeSkippedPost(
  submission: MinimalSubmission,
): Promise<SkipSummary | null> {
  const title = sanitize(submission.title)
  const body = sanitize(submission.selftext || "")
  const flair = sanitize(submission.link_flair_text)
  const subreddit = submission.subreddit.display_name

  const wordCountEstimate = countWords(body || title)
  const linkCount = countLinks(body)

  const promptContext = [
    `Title: ${title || "(no title)"}`,
    flair ? `Flair: ${flair}` : null,
    body ? `Body:\n${truncate(body, 2000)}` : "Body: (empty)",
    `Observed upvotes: ${submission.ups}`,
    `Approximate word count: ${wordCountEstimate}`,
    `Detected links: ${linkCount}`,
  ]
    .filter(Boolean)
    .join("\n\n")

  const systemText =
    'You are an analyst helping a founder understand why they skipped replying to a Reddit launch post. Always respond with STRICT JSON (no markdown) shaped as {"summary": string, "intent": string, "metrics": {"wordCount": number|null, "linkCount": number|null, "upvotes": number|null, "launchStage": string|null, "audience": string|null, "sentiment": string|null}}. Summary (<=60 words) should capture the gist of the product/problem. Intent (<=30 words) should describe what the poster wants (e.g., feedback, awareness, fundraising). Metrics.launchStage should infer how mature the product is (idea, alpha, beta, launched, scaling) if possible. Metrics.audience should describe who they target. Metrics.sentiment should capture tone (optimistic, frustrated, urgent, bragging, etc.). When unsure, use null.'

  const payload = {
    model: config.openAIModel,
    store: false,
    parallel_tool_calls: false,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: systemText,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Subreddit: r/${subreddit}\n${promptContext}`,
          },
        ],
      },
    ],
    max_output_tokens: clamp(Math.max(config.maxDraftTokens, 280), 120, 640),
    temperature: 0.2,
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openAIApiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI skip summary error:", errorText)
      return null
    }

    const data = await response.json()

    const outputSegments = Array.isArray(data.output)
      ? data.output.flatMap((segment: any) =>
          Array.isArray(segment?.content)
            ? segment.content.filter(
                (chunk: any) => chunk?.type === "output_text",
              )
            : [],
        )
      : []

    const jsonText = outputSegments
      .map((chunk: any) => chunk?.text)
      .filter(Boolean)
      .join("\n")
      .trim()

    if (!jsonText) {
      console.warn("OpenAI skip summary returned empty payload.")
      return null
    }

    const parsed = parseJsonObject(jsonText)
    if (!parsed || typeof parsed !== "object") {
      console.warn("Unable to parse skip summary JSON.", jsonText)
      return null
    }

    const summaryText = sanitize((parsed as any).summary)
    const intentText = sanitize((parsed as any).intent)
    const metricsRaw = (parsed as any).metrics

    if (!summaryText && !intentText) {
      return null
    }

    const metrics: SkipSummaryMetrics | undefined = metricsRaw
      ? {
          wordCount: normalizeNumber(metricsRaw.wordCount, wordCountEstimate),
          linkCount: normalizeNumber(metricsRaw.linkCount, linkCount),
          upvotes: normalizeNumber(metricsRaw.upvotes, submission.ups),
          launchStage: sanitize(metricsRaw.launchStage) || undefined,
          audience: sanitize(metricsRaw.audience) || undefined,
          sentiment: sanitize(metricsRaw.sentiment) || undefined,
        }
      : undefined

    return {
      summary: summaryText || "",
      intent: intentText || "",
      metrics,
      raw: parsed,
    }
  } catch (error) {
    console.error("Failed to summarize skipped post:", error)
    return null
  }
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, maxLength - 3)}...`
}

function countWords(value: string): number {
  if (!value) {
    return 0
  }
  const tokens = value.trim().split(/\s+/).filter(Boolean)
  return tokens.length
}

function countLinks(value: string): number {
  if (!value) {
    return 0
  }
  const matches = value.match(/https?:\/\//gi)
  return matches ? matches.length : 0
}

function parseJsonObject(text: string): unknown {
  if (!text) {
    return null
  }

  const trimmed = text.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}

function normalizeNumber(
  value: unknown,
  fallback?: number,
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  if (typeof fallback === "number" && Number.isFinite(fallback)) {
    return fallback
  }

  return undefined
}

function printSkipSummary(
  submission: MinimalSubmission,
  summary: SkipSummary,
): void {
  const header = `📝 Skip summary for r/${submission.subreddit.display_name}`
  console.log(`\n${header}`)
  if (summary.summary) {
    console.log(`  Summary : ${summary.summary}`)
  }
  if (summary.intent) {
    console.log(`  Intent  : ${summary.intent}`)
  }

  const metrics = summary.metrics
  if (metrics) {
    const parts: string[] = []
    if (metrics.launchStage) {
      parts.push(`stage=${metrics.launchStage}`)
    }
    if (metrics.audience) {
      parts.push(`audience=${metrics.audience}`)
    }
    if (metrics.sentiment) {
      parts.push(`sentiment=${metrics.sentiment}`)
    }
    if (typeof metrics.wordCount === "number") {
      parts.push(`words=${metrics.wordCount}`)
    }
    if (typeof metrics.linkCount === "number") {
      parts.push(`links=${metrics.linkCount}`)
    }
    if (typeof metrics.upvotes === "number") {
      parts.push(`upvotes=${metrics.upvotes}`)
    }

    if (parts.length) {
      console.log(`  Metrics : ${parts.join(", ")}`)
    }
  }
}

function extractKeywords(submission: MinimalSubmission): string[] {
  return extractKeywordsFromParts([
    submission.title,
    submission.selftext,
    submission.link_flair_text,
  ])
}

function extractKeywordsFromParts(
  parts: (string | null | undefined)[],
): string[] {
  const collected: string[] = []

  for (const part of parts) {
    if (!part) {
      continue
    }

    const normalized = sanitize(part)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")

    for (const token of normalized.split(/\s+/)) {
      if (!token) {
        continue
      }

      if (token.length < 3) {
        continue
      }

      if (STOP_WORDS.has(token)) {
        continue
      }

      collected.push(token)
    }
  }

  const unique: string[] = []
  const seen = new Set<string>()

  for (const token of collected) {
    if (seen.has(token)) {
      continue
    }

    seen.add(token)
    unique.push(token)

    if (unique.length >= 32) {
      break
    }
  }

  return unique
}

function buildTopicSignature(keywords: string[]): string | null {
  if (!keywords.length) {
    return null
  }

  const unique = Array.from(
    new Set(keywords.map((keyword) => keyword.toLowerCase())),
  )
  if (!unique.length) {
    return null
  }

  return unique.sort().slice(0, 8).join("|")
}

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase())
    })
  })
}

function sanitize(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim()
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
}

function shuffle<T>(values: T[]): T[] {
  const copy = [...values]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }

  return copy
}

async function waitForNextPoll(durationMs: number): Promise<void> {
  if (durationMs <= 0) {
    return
  }

  if (!process.stdout.isTTY) {
    console.log(`Waiting ${Math.round(durationMs / 1000)}s before next poll...`)
    await sleep(durationMs)
    return
  }

  const frames = [".   ", "..  ", "... ", "....", "....."]
  let frameIndex = 0
  const start = Date.now()

  const render = () => {
    const elapsed = Date.now() - start
    const remainingSeconds = Math.max(
      0,
      Math.ceil((durationMs - elapsed) / 1000),
    )
    const frame = frames[frameIndex % frames.length]
    frameIndex += 1

    readline.cursorTo(process.stdout, 0)
    process.stdout.write(
      `Waiting for next poll (${remainingSeconds}s) ${frame}`,
    )
  }

  render()
  const interval = setInterval(render, 250)

  try {
    await sleep(durationMs)
  } finally {
    clearInterval(interval)
    readline.cursorTo(process.stdout, 0)
    readline.clearLine(process.stdout, 0)
  }
}

async function loadState(filePath: string): Promise<BotState> {
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    return JSON.parse(raw)
  } catch (error: any) {
    if (error.code === "ENOENT") {
      await ensureDir(path.dirname(filePath))
      await fs.writeFile(filePath, JSON.stringify({}, null, 2))
      return {}
    }

    console.error("Failed to load bot state. Starting with empty cache.", error)
    return {}
  }
}

async function saveState(filePath: string, value: BotState): Promise<void> {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, JSON.stringify(value, null, 2))
}

async function loadSkipLog(filePath: string): Promise<void> {
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      console.warn(
        `Skip log at ${filePath} is not an array. Reinitialising to empty list.`,
      )
      skipLog.splice(0, skipLog.length)
      await saveSkipLog(filePath)
      return
    }

    skipLog.splice(0, skipLog.length, ...parsed.filter(Boolean))
  } catch (error: any) {
    if (error.code === "ENOENT") {
      skipLog.splice(0, skipLog.length)
      await saveSkipLog(filePath)
      return
    }

    console.warn(
      `Failed to load skip log file at ${filePath}. Starting with empty list.`,
      error,
    )
    skipLog.splice(0, skipLog.length)
  }
}

async function appendSkipLog(
  submission: MinimalSubmission,
  options: SkipLogOptions,
): Promise<void> {
  const permalink =
    buildPermalink(submission.permalink) ||
    (submission.permalink ? `https://reddit.com${submission.permalink}` : "")

  const entry: SkipLogEntry = {
    id: submission.id,
    permalink,
    subreddit: submission.subreddit.display_name,
    title: sanitize(submission.title),
    skippedAt: new Date().toISOString(),
    source: options.source,
    reason: options.reason || undefined,
    keywords: options.descriptor.keywords.length
      ? options.descriptor.keywords
      : undefined,
    topicSignature: options.descriptor.topicSignature || undefined,
    summary: options.summary?.summary || undefined,
    intent: options.summary?.intent || undefined,
    metrics: options.summary?.metrics,
  }

  const existingIndex = skipLog.findIndex((item) => item.id === submission.id)
  if (existingIndex >= 0) {
    skipLog.splice(existingIndex, 1, entry)
  } else {
    skipLog.push(entry)
  }

  await saveSkipLog(config.skipLogFile)
}

async function saveSkipLog(filePath: string): Promise<void> {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, JSON.stringify(skipLog, null, 2))
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildPermalink(permalink: string): string {
  if (!permalink) {
    return ""
  }

  if (permalink.startsWith("http")) {
    return permalink
  }

  const normalized = permalink.startsWith("/") ? permalink : `/${permalink}`
  return `https://reddit.com${normalized}`
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function buildSubredditGuidance(name: string): string | undefined {
  const entry = subredditConfigMap.get(name.toLowerCase())
  if (!entry) {
    return undefined
  }

  const parts = [entry.intent, entry.notes, entry.ruleSummary]
  const bullets: string[] = []
  const seen = new Set<string>()

  for (const part of parts) {
    if (part == null) {
      continue
    }

    const values = Array.isArray(part) ? part : [part]

    for (const value of values) {
      const normalized = normalizeGuidancePart(value)
      if (!normalized) {
        continue
      }

      if (!seen.has(normalized)) {
        seen.add(normalized)
        bullets.push(`- ${normalized}`)
      }
    }
  }

  if (!bullets.length) {
    return undefined
  }

  return bullets.join("\n")
}

function normalizeGuidancePart(value?: unknown): string | null {
  const cleaned = sanitize(value)
  return cleaned ? cleaned : null
}

main().catch(async (error) => {
  console.error("Fatal error running Reddit bot:", error)
  await saveState(config.stateFile, state)
  rl.close()
  process.exit(1)
})
