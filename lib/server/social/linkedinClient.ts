import { notifyLinkedInAuthNeeded } from "./linkedinNotify"
import { getLinkedInAccessToken, resolveOrganizationUrn } from "./linkedinAuth"

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return ["1", "true", "yes", "on"].includes(normalized)
}

type LinkedInRuntimeConfig = {
  dryRun: boolean
  missing: string[]
  isEnabled: boolean
}

type LinkedInPostResult = {
  posted: boolean
  reason?: string
  status?: number
  detail?: string
}

let cachedConfig: LinkedInRuntimeConfig | null = null

function readConfig(): LinkedInRuntimeConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const dryRun = parseBoolean(process.env.LINKEDIN_BOT_DRY_RUN)

  cachedConfig = {
    dryRun,
    missing: [],
    isEnabled: true,
  }

  return cachedConfig
}

export function isLinkedInBotEnabled(): boolean {
  return readConfig().isEnabled
}

export function isLinkedInBotDryRun(): boolean {
  return readConfig().dryRun
}

function parseLinkedInError(
  status: number,
  detail?: string,
): LinkedInPostResult {
  let reason: LinkedInPostResult["reason"] = "api-error"
  if (status === 401) {
    reason = "unauthorized"
  } else if (status === 403) {
    reason = "forbidden"
  } else if (status === 429) {
    reason = "rate-limit"
  } else if (status >= 500) {
    reason = "server-error"
  }

  return {
    posted: false,
    reason,
    status,
    detail,
  }
}

export async function postLinkedInUpdate(
  message: string,
): Promise<LinkedInPostResult> {
  const text = message.trim()
  if (!text.length) {
    return { posted: false, reason: "empty-message" }
  }

  const config = readConfig()

  if (config.dryRun) {
    console.info("[linkedin] dry run post:", text)
    return { posted: false, reason: "dry-run" }
  }

  const accessToken = await getLinkedInAccessToken()
  const authorUrn = await resolveOrganizationUrn()

  if (!config.isEnabled || !accessToken || !authorUrn) {
    if (!accessToken) {
      notifyLinkedInAuthNeeded({
        trigger: "missing-access-token",
      }).catch((error) =>
        console.error("[linkedin] failed to notify admin about missing token", {
          error: error instanceof Error ? error.message : error,
        }),
      )
    }

    return { posted: false, reason: "missing-configuration" }
  }

  try {
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202404",
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text,
            },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    })

    if (response.ok) {
      return { posted: true }
    }

    let detail: string | undefined
    try {
      const json = await response.json()
      detail =
        typeof json?.message === "string"
          ? json.message
          : typeof json?.message === "object"
            ? JSON.stringify(json.message)
            : typeof json?.status === "string"
              ? json.status
              : undefined
    } catch {
      try {
        const text = await response.text()
        detail = text?.trim()?.length ? text.trim() : undefined
      } catch {
        detail = undefined
      }
    }

    return parseLinkedInError(response.status, detail)
  } catch (error) {
    return {
      posted: false,
      reason: "network-error",
      detail: error instanceof Error ? error.message : undefined,
    }
  }
}
