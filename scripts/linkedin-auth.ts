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

import { exchangeLinkedInAuthCode, buildLinkedInRedirectUri } from "@/lib/server/social/linkedinAuth"

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
    const secret = process.env.CRON_SECRET
    if (!clientId || !secret) {
      console.error("Missing LINKEDIN_CLIENT_ID or CRON_SECRET in env.")
      process.exit(1)
    }
    const redirectUri = buildLinkedInRedirectUri()
    const scopes = [
      "w_organization_social",
      "r_organization_social",
      "openid",
      "profile",
    ]
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization")
    url.searchParams.set("response_type", "code")
    url.searchParams.set("client_id", clientId)
    url.searchParams.set("redirect_uri", redirectUri)
    url.searchParams.set("scope", scopes.join(" "))
    url.searchParams.set("state", secret)
    console.log(url.toString())
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
      console.log("Access token stored in Redis. Expires in (s):", result.expiresIn)
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
