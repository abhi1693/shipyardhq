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

type BotState = Record<
  string,
  {
    decision: Decision
    permalink: string
    processedAt: string
  }
>

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
}

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
  console.log(`Loaded ${Object.keys(state).length} previously processed posts.`)

  while (true) {
    for (const subredditName of config.subreddits) {
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

    const previousDrafts: string[] = []
    const seedAvoid = [...recentReplies.slice(-8)]
    let draft = await draftReply(submission, {
      avoid: [...previousDrafts, ...seedAvoid],
    })

    if (!draft) {
      continue
    }

    let decision: Decision | null = null

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
        }
        break
      }

      if (choice === "n") {
        console.log(`
⏭️ Skipped https://reddit.com${submission.permalink}`)
        decision = "skipped"
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
        break
      }

      draft = nextDraft
    }

    if (!decision) {
      continue
    }

    state[submission.id] = {
      decision,
      permalink: buildPermalink(submission.permalink),
      processedAt: new Date().toISOString(),
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
    "You are a concise, friendly community manager for Shipyard HQ. Draft a short (<=80 words) encouraging reply to founders showcasing their product on Reddit. Each reply must feel bespoke—reference specific details from their product or problem, and vary your tone, sentence structure, and CTA wording every time. Mention that Shipyard listings are free, take roughly thirty seconds, and go live immediately without queues or paid slots, but phrase those facts in fresh language. Offer help if they have questions and keep a positive, founder-to-founder tone without sounding spammy or formulaic." +
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
- restate Shipyard's benefits in your own words (free listing, ~30 second launch, instant publishing, no queues/paid slots) with varied phrasing.
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

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase())
    })
  })
}

function sanitize(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim()
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, value))
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
    const normalized = normalizeGuidancePart(part)
    if (!normalized) {
      continue
    }

    if (!seen.has(normalized)) {
      seen.add(normalized)
      bullets.push(`- ${normalized}`)
    }
  }

  if (!bullets.length) {
    return undefined
  }

  return bullets.join("\n")
}

function normalizeGuidancePart(value?: string | null): string | null {
  if (!value) {
    return null
  }

  const cleaned = sanitize(value)
  return cleaned ? cleaned : null
}

main().catch(async (error) => {
  console.error("Fatal error running Reddit bot:", error)
  await saveState(config.stateFile, state)
  rl.close()
  process.exit(1)
})
