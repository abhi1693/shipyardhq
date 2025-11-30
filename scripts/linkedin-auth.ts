#!/usr/bin/env tsx
/**
 * LinkedIn OAuth helper for local/staging:
 * - Step 1: Print the authorization URL
 *   npx tsx scripts/linkedin-auth.ts url
 * - Step 2: After approving in the browser, paste the ?code=...&state=... URL:
 *   npx tsx scripts/linkedin-auth.ts exchange "<redirected_url>"
 *
 * This exchanges the code for an access token and stores it in Redis.
 */

import {
  exchangeLinkedInAuthCode,
  buildLinkedInRedirectUri,
  buildLinkedInAuthRequest,
} from "@/lib/server/social/linkedinAuth"
import { spawn } from "child_process"

function trySpawn(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: true,
    })

    let settled = false
    let spawnTimer: NodeJS.Timeout | null = null

    const cleanup = () => {
      child.removeListener("error", onError)
      child.removeListener("spawn", onSpawn)
      child.removeListener("exit", onExit)
      if (spawnTimer) {
        clearTimeout(spawnTimer)
      }
    }

    const onError = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }

    const onSpawn = () => {
      // Resolve after a short delay to allow immediate exit codes to propagate.
      spawnTimer = setTimeout(() => {
        if (settled) return
        settled = true
        cleanup()
        child.unref()
        resolve()
      }, 300)
    }

    const onExit = (code: number | null) => {
      if (settled) return
      if (code === 0 && spawnTimer) {
        settled = true
        cleanup()
        child.unref()
        resolve()
        return
      }

      settled = true
      cleanup()
      reject(new Error(`Process exited with code ${code ?? "unknown"}`))
    }

    child.once("error", onError)
    child.once("spawn", onSpawn)
    child.once("exit", onExit)
  })
}

async function openInChrome(url: string) {
  const attempts: Array<[string, string[]]> = []

  if (process.platform === "darwin") {
    attempts.push(["open", ["-a", "Google Chrome", url]])
  } else if (process.platform === "win32") {
    attempts.push(["cmd", ["/c", "start", "chrome", url]])
  } else {
    attempts.push(["google-chrome", [url]])
    attempts.push(["chromium-browser", [url]])
    attempts.push(["chrome", [url]])
    attempts.push(["xdg-open", [url]])
  }

  for (const [command, args] of attempts) {
    try {
      await trySpawn(command, args)
      return true
    } catch {
      continue
    }
  }

  return false
}

async function main() {
  const [, , command, arg] = process.argv
  if (!command || command === "help") {
    console.log(
      "Usage:\n" +
        "  tsx scripts/linkedin-auth.ts url\n" +
        '  tsx scripts/linkedin-auth.ts exchange "<redirect_url_with_code_and_state>"',
    )
    process.exit(0)
  }

  if (command === "url") {
    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      console.error(
        "Missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET in env.",
      )
      process.exit(1)
    }
    try {
      const { authUrl } = await buildLinkedInAuthRequest()
      const opened = await openInChrome(authUrl)

      console.log(
        opened
          ? "Opened auth URL in Google Chrome."
          : "Chrome not found; copy/paste this URL manually:\n" + authUrl,
      )
    } catch (error) {
      console.error(
        "Failed to create OAuth state token:",
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
    return
  }

  if (command === "exchange") {
    if (!arg) {
      console.error("Provide the full redirect URL containing code and state.")
      process.exit(1)
    }

    const url = new URL(arg)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const redirectUri = buildLinkedInRedirectUri()

    if (!code || !state) {
      console.error("Missing code or state in provided URL.")
      process.exit(1)
    }

    try {
      const result = await exchangeLinkedInAuthCode({
        code,
        redirectUri,
        state,
      })
      console.log(
        "Access token stored in Redis. Expires in (s):",
        result.expiresIn,
      )
    } catch (error) {
      console.error(
        "Failed to exchange code:",
        error instanceof Error ? error.message : error,
      )
      process.exit(1)
    }
    return
  }

  console.error(`Unknown command: ${command}`)
  process.exit(1)
}

void main()
