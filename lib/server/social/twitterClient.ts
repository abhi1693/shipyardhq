import { TwitterApi } from "twitter-api-v2"

const REQUIRED_ENV_VARS = [
  "TWITTER_APP_KEY",
  "TWITTER_APP_SECRET",
  "TWITTER_ACCESS_TOKEN",
  "TWITTER_ACCESS_SECRET",
] as const

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return ["1", "true", "yes", "on"].includes(normalized)
}

type TwitterCredentials = {
  appKey: string
  appSecret: string
  accessToken: string
  accessSecret: string
}

type TwitterRuntimeConfig = {
  requested: boolean
  dryRun: boolean
  missing: string[]
  isEnabled: boolean
  credentials?: TwitterCredentials
}

let cachedConfig: TwitterRuntimeConfig | null = null
let clientInstance: TwitterApi | null = null
let warnedMissing = false

function readConfig(): TwitterRuntimeConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const requested = parseBoolean(process.env.TWITTER_BOT_ENABLED)
  const dryRun = parseBoolean(process.env.TWITTER_BOT_DRY_RUN)

  const credentialsCandidate: Record<string, string> = {}
  const missing: string[] = []

  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key]
    if (value && value.trim().length) {
      credentialsCandidate[key] = value.trim()
    } else {
      missing.push(key)
    }
  }

  const credentials: TwitterCredentials | undefined =
    missing.length === 0
      ? {
          appKey: credentialsCandidate.TWITTER_APP_KEY,
          appSecret: credentialsCandidate.TWITTER_APP_SECRET,
          accessToken: credentialsCandidate.TWITTER_ACCESS_TOKEN,
          accessSecret: credentialsCandidate.TWITTER_ACCESS_SECRET,
        }
      : undefined

  cachedConfig = {
    requested,
    dryRun,
    missing,
    isEnabled: requested && missing.length === 0,
    credentials,
  }

  if (cachedConfig.requested && cachedConfig.missing.length && !warnedMissing) {
    console.warn(
      "[twitter] bot disabled: missing env vars",
      cachedConfig.missing,
    )
    warnedMissing = true
  }

  return cachedConfig
}

function getClient(): TwitterApi | null {
  const config = readConfig()
  if (!config.isEnabled || !config.credentials) {
    return null
  }
  if (!clientInstance) {
    clientInstance = new TwitterApi({
      appKey: config.credentials.appKey,
      appSecret: config.credentials.appSecret,
      accessToken: config.credentials.accessToken,
      accessSecret: config.credentials.accessSecret,
    })
  }
  return clientInstance
}

export function isTwitterBotActive(): boolean {
  const config = readConfig()
  return config.dryRun || config.requested
}

export function isTwitterBotEnabled(): boolean {
  return readConfig().isEnabled
}

export function isTwitterBotDryRun(): boolean {
  return readConfig().dryRun
}

export async function postTweet(
  message: string,
): Promise<{ posted: boolean; reason?: string }> {
  const text = message.trim()
  if (!text.length) {
    return { posted: false, reason: "empty-message" }
  }

  const config = readConfig()
  if (!config.requested && !config.dryRun) {
    return { posted: false, reason: "inactive" }
  }

  if (config.dryRun) {
    console.info("[twitter] dry run tweet:", text)
    return { posted: false, reason: "dry-run" }
  }

  if (!config.isEnabled) {
    return { posted: false, reason: "missing-configuration" }
  }

  try {
    const client = getClient()
    if (!client) {
      return { posted: false, reason: "missing-client" }
    }
    await client.v2.tweet(text)
    return { posted: true }
  } catch (error) {
    console.error("[twitter] failed to post tweet", error)
    return { posted: false, reason: "api-error" }
  }
}

export function resetTwitterClientCache() {
  cachedConfig = null
  clientInstance = null
  warnedMissing = false
}
