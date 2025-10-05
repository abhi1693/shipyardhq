import { setTimeout as delay } from "node:timers/promises"

import { awardRewards } from "@/lib/rewards/engine"
import {
  RewardsCapExceededError,
  RewardsError,
  RewardRuleInactiveError,
  RewardRuleNotFoundError,
} from "@/lib/rewards/errors"
import { getAppBaseUrl } from "@/lib/email/utils"
import { productPath } from "@/lib/routes"
import prisma from "@/lib/prisma"
import { ProductStatus, type Prisma } from "@/lib/vendor/prisma/client"

export const BACKLINK_CRON_LOG_PREFIX = "[cron.rewards.backlinks]" as const

type BacklinkCheckSuccess = {
  status: "verified"
  foundUrl: string
}

type BacklinkCheckMissing = {
  status: "missing"
  reason: string
}

type BacklinkCheckError = {
  status: "error"
  reason: string
}

type BacklinkCheckResult =
  | BacklinkCheckSuccess
  | BacklinkCheckMissing
  | BacklinkCheckError

export type BacklinkVerificationSummary = {
  checked: number
  verified: number
  newlyVerified: number
  missing: number
  errors: number
  awarded: number
  failures: Array<{ productId: string; reason: string }>
}

const USER_AGENT = "ShipyardHQ-BacklinkVerifier/1.0"
const DEFAULT_TIMEOUT_MS = 10_000
const CONCURRENCY = 5
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])

function getCandidateBaseUrls(): string[] {
  const bases = new Set<string>()
  const appBase = getAppBaseUrl().replace(/\/$/, "")
  bases.add(appBase)

  // Common fallbacks for older badge snippets/domains
  if (appBase !== "https://shipyardhq.dev") {
    bases.add("https://shipyardhq.dev")
  }
  bases.add("https://shipyardhq.com")

  return Array.from(bases)
}

function createHostVariants(rawUrl: string): string[] {
  try {
    const url = new URL(rawUrl)
    const hosts = new Set<string>()
    const baseHost = url.hostname.toLowerCase()
    hosts.add(baseHost)
    if (baseHost.startsWith("www.")) {
      hosts.add(baseHost.replace(/^www\./, ""))
    } else {
      hosts.add(`www.${baseHost}`)
    }
    return Array.from(hosts)
  } catch {
    return []
  }
}

function buildCandidateHosts(): Set<string> {
  const hosts = new Set<string>()
  for (const base of getCandidateBaseUrls()) {
    for (const host of createHostVariants(base)) {
      hosts.add(host)
    }
  }
  return hosts
}

const BACKLINK_HOSTS = buildCandidateHosts()

function normalizePath(pathname: string): string {
  if (!pathname) return "/"
  if (pathname === "/") return pathname
  return pathname.replace(/\/+$/, "") || "/"
}

function normalizeProductPath(slug: string): string {
  return normalizePath(productPath(slug))
}

function ensureAbsoluteUrl(candidate: string, base?: string | URL): URL | null {
  try {
    return base ? new URL(candidate, base) : new URL(candidate)
  } catch {
    return null
  }
}

async function fetchWithTimeout(url: URL, attempt = 1): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      },
      redirect: "follow",
      signal: controller.signal,
    })

    if (
      !response.ok &&
      RETRYABLE_STATUS_CODES.has(response.status) &&
      attempt === 1
    ) {
      // brief delay then retry once
      await delay(300)
      return fetchWithTimeout(url, attempt + 1)
    }

    return response
  } finally {
    clearTimeout(timeout)
  }
}

function parseHrefAttributes(html: string): string[] {
  const hrefs: string[] = []
  const regex = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html))) {
    const href = match[1] ?? match[2] ?? match[3] ?? ""
    if (!href) continue
    hrefs.push(href.trim())
  }
  return hrefs
}

function matchesExpectedTarget(url: URL, slug: string): boolean {
  if (!BACKLINK_HOSTS.has(url.hostname.toLowerCase())) {
    return false
  }
  const expectedPath = normalizeProductPath(slug)
  const candidatePath = normalizePath(url.pathname)
  if (candidatePath !== expectedPath) {
    return false
  }
  return true
}

async function checkBacklink(product: {
  id: string
  slug: string
  websiteUrl: string | null
}): Promise<BacklinkCheckResult> {
  const rawWebsite = product.websiteUrl?.trim()
  if (!rawWebsite) {
    return { status: "error", reason: "Missing website URL" }
  }

  const websiteUrl = ensureAbsoluteUrl(rawWebsite)
  if (!websiteUrl) {
    return { status: "error", reason: "Invalid website URL" }
  }

  // Skip Shipyard domains to avoid self-checks
  if (BACKLINK_HOSTS.has(websiteUrl.hostname.toLowerCase())) {
    return {
      status: "missing",
      reason: "Product website is on Shipyard domain; skip backlink check",
    }
  }

  try {
    const response = await fetchWithTimeout(websiteUrl)
    if (!response.ok) {
      return {
        status: "error",
        reason: `Request failed with status ${response.status}`,
      }
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (!/html|xml/i.test(contentType)) {
      return {
        status: "missing",
        reason: "Website did not return HTML content",
      }
    }

    const html = await response.text()
    const hrefs = parseHrefAttributes(html)

    for (const href of hrefs) {
      const resolved = ensureAbsoluteUrl(href, websiteUrl)
      if (!resolved) continue
      if (matchesExpectedTarget(resolved, product.slug)) {
        return { status: "verified", foundUrl: resolved.toString() }
      }
    }

    return {
      status: "missing",
      reason: "Backlink not found in fetched HTML",
    }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "Unknown error"
    return { status: "error", reason }
  }
}

async function processProduct(
  product: {
    id: string
    slug: string
    userId: string
    websiteUrl: string | null
    verification: {
      id: string
      backlinkIsVerified: boolean
      backlinkVerifiedAt: Date | null
      backlinkFoundUrl: string | null
      backlinkLastCheckedAt: Date | null
      backlinkLastError: string | null
    } | null
  },
  summary: BacklinkVerificationSummary,
  now: Date,
) {
  if (!product.verification) {
    console.error(`${BACKLINK_CRON_LOG_PREFIX} missing verification record`, {
      productId: product.id,
      slug: product.slug,
    })
    summary.failures.push({
      productId: product.id,
      reason: "Product missing verification record",
    })
    summary.errors += 1
    return
  }

  const verification = product.verification

  console.info(`${BACKLINK_CRON_LOG_PREFIX} checking backlink`, {
    productId: product.id,
    slug: product.slug,
    websiteUrl: product.websiteUrl,
    previouslyVerified: verification.backlinkIsVerified,
    lastCheckedAt: verification.backlinkLastCheckedAt?.toISOString() ?? null,
  })

  const check = await checkBacklink(product)
  summary.checked += 1

  const update: Prisma.ProductVerificationUpdateInput = {
    backlinkLastCheckedAt: now,
  }

  if (check.status === "verified") {
    summary.verified += 1
    update.backlinkIsVerified = true
    update.backlinkFoundUrl = check.foundUrl
    update.backlinkLastError = null
    if (!verification.backlinkIsVerified) {
      console.info(`${BACKLINK_CRON_LOG_PREFIX} backlink verified`, {
        productId: product.id,
        slug: product.slug,
        foundUrl: check.foundUrl,
        status: "newlyVerified",
      })
      summary.newlyVerified += 1
      update.backlinkVerifiedAt = now
      await persistUpdateAndMaybeReward(
        product,
        verification.id,
        update,
        summary,
        now,
        check.foundUrl,
      )
      return
    }

    // Preserve original verified timestamp if already set
    if (!verification.backlinkVerifiedAt) {
      update.backlinkVerifiedAt = now
    }
    await prisma.productVerification.update({
      where: { id: verification.id },
      data: update,
    })
    console.info(`${BACKLINK_CRON_LOG_PREFIX} backlink already verified`, {
      productId: product.id,
      slug: product.slug,
      foundUrl: check.foundUrl,
    })
    return
  }

  if (check.status === "missing") {
    summary.missing += 1
    update.backlinkIsVerified = false
    update.backlinkFoundUrl = null
    update.backlinkVerifiedAt = null
    update.backlinkLastError = check.reason
    await prisma.productVerification.update({
      where: { id: verification.id },
      data: update,
    })
    console.warn(`${BACKLINK_CRON_LOG_PREFIX} backlink missing`, {
      productId: product.id,
      slug: product.slug,
      reason: check.reason,
    })
    return
  }

  summary.errors += 1
  summary.failures.push({ productId: product.id, reason: check.reason })
  update.backlinkIsVerified = false
  update.backlinkFoundUrl = null
  update.backlinkVerifiedAt = null
  update.backlinkLastError = check.reason
  await prisma.productVerification.update({
    where: { id: verification.id },
    data: update,
  })
  console.error(`${BACKLINK_CRON_LOG_PREFIX} backlink check error`, {
    productId: product.id,
    slug: product.slug,
    reason: check.reason,
  })
}

async function persistUpdateAndMaybeReward(
  product: {
    id: string
    slug: string
    userId: string
  },
  verificationId: string,
  update: Prisma.ProductVerificationUpdateInput,
  summary: BacklinkVerificationSummary,
  now: Date,
  foundUrl: string,
) {
  await prisma.productVerification.update({
    where: { id: verificationId },
    data: update,
  })

  try {
    const eventId = `backlink:${product.id}`
    await awardRewards(product.userId, "rewards.backlink.verify", {
      eventId,
      productId: product.id,
      targetType: "product",
      targetId: product.id,
      metadata: {
        slug: product.slug,
        event: "backlinkVerification",
        backlinkUrl: foundUrl,
        verifiedAt: now.toISOString(),
      },
      sourceType: "cron",
      sourceId: "backlink-verifier",
    })
    summary.awarded += 1
    console.info(`${BACKLINK_CRON_LOG_PREFIX} reward granted`, {
      productId: product.id,
      slug: product.slug,
      eventId,
    })
  } catch (error) {
    if (error instanceof RewardsCapExceededError) {
      console.info(`${BACKLINK_CRON_LOG_PREFIX} reward skipped`, {
        productId: product.id,
        slug: product.slug,
        reason: "capExceeded",
      })
      return
    }
    if (error instanceof RewardRuleNotFoundError) {
      console.warn(`${BACKLINK_CRON_LOG_PREFIX} reward rule missing`, {
        productId: product.id,
        slug: product.slug,
        reason: "ruleNotFound",
      })
      return
    }
    if (error instanceof RewardRuleInactiveError) {
      console.warn(`${BACKLINK_CRON_LOG_PREFIX} reward rule inactive`, {
        productId: product.id,
        slug: product.slug,
        reason: "ruleInactive",
      })
      return
    }
    if (error instanceof RewardsError) {
      summary.failures.push({
        productId: product.id,
        reason: `Rewards error: ${error.message}`,
      })
      summary.errors += 1
      console.error(`${BACKLINK_CRON_LOG_PREFIX} reward processing error`, {
        productId: product.id,
        slug: product.slug,
        message: error.message,
      })
      return
    }
    console.error(`${BACKLINK_CRON_LOG_PREFIX} unexpected reward error`, {
      productId: product.id,
      slug: product.slug,
      message: error instanceof Error ? error.message : "Unknown error",
    })
    throw error
  }
}

export async function runBacklinkVerification(
  now: Date = new Date(),
): Promise<BacklinkVerificationSummary> {
  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.published,
    },
    select: {
      id: true,
      slug: true,
      websiteUrl: true,
      userId: true,
      verification: {
        select: {
          id: true,
          backlinkIsVerified: true,
          backlinkVerifiedAt: true,
          backlinkFoundUrl: true,
          backlinkLastCheckedAt: true,
          backlinkLastError: true,
        },
      },
    },
  })

  console.info(`${BACKLINK_CRON_LOG_PREFIX} fetched published products`, {
    count: products.length,
  })

  const summary: BacklinkVerificationSummary = {
    checked: 0,
    verified: 0,
    newlyVerified: 0,
    missing: 0,
    errors: 0,
    awarded: 0,
    failures: [],
  }

  const queue = [...products]
  const workers: Promise<void>[] = []

  for (let i = 0; i < CONCURRENCY; i += 1) {
    workers.push(
      (async () => {
        while (queue.length) {
          const product = queue.pop()
          if (!product) break
          try {
            await processProduct(product, summary, now)
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : "Unknown error"
            summary.errors += 1
            summary.failures.push({ productId: product.id, reason })
            console.error(
              `${BACKLINK_CRON_LOG_PREFIX} product processing failed`,
              {
                productId: product.id,
                slug: product.slug,
                reason,
              },
            )
          }
        }
      })(),
    )
  }

  await Promise.all(workers)

  const summarySnapshot: BacklinkVerificationSummary = {
    ...summary,
    failures: summary.failures.map((failure) => ({ ...failure })),
  }

  console.info(
    `${BACKLINK_CRON_LOG_PREFIX} verification summary`,
    summarySnapshot,
  )

  return summary
}
