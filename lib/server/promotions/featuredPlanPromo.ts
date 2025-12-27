import { randomUUID } from "crypto"
import { format, subDays } from "date-fns"

import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { IS_PROD } from "@/lib/constants"
import { getRedisClient, type RedisClient } from "@/lib/server/redis"
import { buildCacheKey } from "@/lib/server/cache"
import { resolveSiteUrl, siteConfig } from "@/lib/siteConfig"
import { productPath } from "@/lib/routes"
import {
  getProductTrafficMapFromGa,
  type GaDateRange,
} from "@/lib/server/analytics/googleAnalytics"
import { toNovuSubscriberInput } from "@/lib/server/notifications/novu"
import { sendFeaturedPlanPromotionNotification } from "@/lib/server/notifications/novuPromotions"

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const FEATURED_PLAN_SLUG = "featured"
export const FEATURED_PROMO_VERSION = 2

const DEFAULT_DAILY_MAX_RECIPIENTS = 6
const DEFAULT_COOLDOWN_DAYS = 60
const DEFAULT_ACTIVITY_WINDOW_DAYS = 7

const MIN_DISCOUNT_PCT = 5
const MAX_DISCOUNT_PCT = 85
const DISCOUNT_BUCKET_PCT = 5
const MIN_DISCOUNT_VALID_HOURS = 12
const MAX_DISCOUNT_VALID_HOURS = 6 * 24
const DEFAULT_DISCOUNT_VALID_HOURS = 24

const DEFAULT_STATE_TTL_DAYS = 365
const RUN_LOCK_TTL_SECONDS = 60 * 60 * 25

const PENDING_SET_KEY = buildCacheKey(
  "promotions",
  "featured",
  "pending",
  `v${FEATURED_PROMO_VERSION}`,
)

export type FeaturedPromoOffer = {
  planId: string
  planSlug: string
  productId: string
  productSlug: string
  productName: string
  discountId: string
  discountCode: string
  discountPct: number
  checkoutUrl: string | null
  transactionId: string
  claimToken?: string
  createdAt: string
  expiresAt: string
  notifiedAt: string | null
}

export type FeaturedPromoState = {
  version: number
  userId: string
  attempts: number
  lastNotifiedAt: string | null
  offer: FeaturedPromoOffer | null
}

type CandidateMetrics = {
  traffic7d: number
  upvotes7d: number
  score: number
}

type PromoCandidate = {
  productId: string
  productSlug: string
  productName: string
  user: {
    id: string
    clerkId: string
    email: string
    firstName: string | null
    lastName: string | null
  }
  metrics: CandidateMetrics
}

type NotifyOfferResult =
  | { ok: true }
  | {
      ok: false
      reason: "missing-claim-token" | "missing-recipient" | "send-failed"
    }

export type FeaturedPlanPromoRunResult = {
  success: boolean
  dryRun: boolean
  runDay: string
  plan: {
    id: string
    slug: string
    externalId: string
    boostForDays: number
    discountPct: number | null
  }
  slots: {
    dailyMax: number
    paidFeaturedCustomers: number
    available: number
  }
  windowDays: number
  cooldownDays: number
  candidates: number
  pendingOffers: number
  prepared: number
  notified: number
  skipped: number
  reasons: Record<string, number>
  sample: Array<{
    productSlug: string
    discountPct: number
    traffic7d: number
    upvotes7d: number
  }>
}

function parseBoolParam(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

function resolveGaDateRange(now: Date, days: number): GaDateRange {
  const safeDays = Math.max(1, Math.floor(days))
  const end = subDays(now, 0)
  const start = subDays(end, safeDays - 1)
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  }
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

function recordReason(reasons: Record<string, number>, key: string) {
  reasons[key] = (reasons[key] ?? 0) + 1
}

function getUtcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10)
}

function runLockKey(dayKey: string): string {
  return buildCacheKey(
    "promotions",
    "featured",
    "run",
    dayKey,
    `v${FEATURED_PROMO_VERSION}`,
  )
}

export function featuredPromoUserStateKey(userId: string): string {
  return buildCacheKey(
    "promotions",
    "featured",
    "user",
    userId,
    `v${FEATURED_PROMO_VERSION}`,
  )
}

export function featuredPromoClaimKey(token: string): string {
  return buildCacheKey(
    "promotions",
    "featured",
    "claim",
    token,
    `v${FEATURED_PROMO_VERSION}`,
  )
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function isValidState(
  state: FeaturedPromoState | null,
): state is FeaturedPromoState {
  if (!state) return false
  if (state.version !== FEATURED_PROMO_VERSION) return false
  if (!state.userId) return false
  if (typeof state.attempts !== "number") return false
  return true
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

function isWithinCooldown(
  lastNotifiedAt: string | null,
  now: Date,
  cooldownDays: number,
): boolean {
  const notifiedAt = parseIsoDate(lastNotifiedAt)
  if (!notifiedAt) return false
  const cutoffMs = cooldownDays * DAY_MS
  return now.getTime() - notifiedAt.getTime() < cutoffMs
}

function floorToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || step <= 0) return value
  return Math.floor(value / step) * step
}

function createClaimToken(): string {
  return randomUUID()
}

function computeDiscountValidHours(discountPct: number): number {
  const pct = clampNumber(discountPct, MIN_DISCOUNT_PCT, MAX_DISCOUNT_PCT)
  const range = Math.max(1, MAX_DISCOUNT_PCT - MIN_DISCOUNT_PCT)
  const normalized = (pct - MIN_DISCOUNT_PCT) / range
  const hours =
    MAX_DISCOUNT_VALID_HOURS -
    normalized * (MAX_DISCOUNT_VALID_HOURS - MIN_DISCOUNT_VALID_HOURS)

  return clampNumber(
    Math.round(hours),
    MIN_DISCOUNT_VALID_HOURS,
    MAX_DISCOUNT_VALID_HOURS,
  )
}

function resolveOfferValidDays(offer: FeaturedPromoOffer): number {
  const createdAt = parseIsoDate(offer.createdAt) ?? new Date()
  const fallbackExpiresAt = new Date(
    createdAt.getTime() + DEFAULT_DISCOUNT_VALID_HOURS * HOUR_MS,
  )
  const expiresAt = parseIsoDate(offer.expiresAt) ?? fallbackExpiresAt
  const durationMs = Math.max(0, expiresAt.getTime() - createdAt.getTime())
  return Math.max(1, Math.ceil(durationMs / DAY_MS))
}

function computeIntentScore(metrics: {
  traffic7d: number
  upvotes7d: number
}): number {
  const traffic = Math.max(0, metrics.traffic7d)
  const upvotes = Math.max(0, metrics.upvotes7d)

  const trafficScore = clampNumber(
    Math.log10(traffic + 1) / Math.log10(250 + 1),
    0,
    1,
  )
  const upvoteScore = clampNumber(upvotes / 6, 0, 1)

  return clampNumber(trafficScore * 0.75 + upvoteScore * 0.25, 0, 1)
}

function computeDiscountPct(args: {
  metrics: CandidateMetrics
  attempts: number
}): number {
  const intent = clampNumber(args.metrics.score, 0, 1)
  // Protect revenue: bias discounts toward the minimum unless intent is low.
  // This is a convex curve (quadratic) so high-intent users are much more likely
  // to get 5–10%, reserving 75–85% for low-intent segments.
  const base =
    MIN_DISCOUNT_PCT +
    (1 - intent) * (1 - intent) * (MAX_DISCOUNT_PCT - MIN_DISCOUNT_PCT)

  // Escalate cautiously when users didn't convert in prior cycles; scale the
  // increase by (1-intent) so high-intent users don't get large discounts.
  const attemptFactor = clampNumber(1 - intent, 0, 1)
  const attemptBonus = clampNumber(
    Math.floor(args.attempts) * 5 * attemptFactor,
    0,
    10,
  )
  const withBonus = base + attemptBonus

  // Round down to protect revenue; still clamp to 5–85.
  const bucketed = floorToStep(withBonus, DISCOUNT_BUCKET_PCT)
  return clampNumber(bucketed, MIN_DISCOUNT_PCT, MAX_DISCOUNT_PCT)
}

async function loadPromoState(
  redis: RedisClient,
  userId: string,
): Promise<FeaturedPromoState | null> {
  const raw = await redis.get(featuredPromoUserStateKey(userId))
  const parsed = parseJson<FeaturedPromoState>(raw ?? null)
  return isValidState(parsed) ? parsed : null
}

async function storePromoState(
  redis: RedisClient,
  userId: string,
  state: FeaturedPromoState,
  ttlDays: number,
): Promise<void> {
  const ttlSeconds = Math.max(1, Math.floor(ttlDays * 24 * 60 * 60))
  await redis.set(featuredPromoUserStateKey(userId), JSON.stringify(state), {
    EX: ttlSeconds,
  })
}

async function ensureRunLock(
  redis: RedisClient,
  dayKey: string,
): Promise<boolean> {
  const result = await redis.set(runLockKey(dayKey), new Date().toISOString(), {
    NX: true,
    EX: RUN_LOCK_TTL_SECONDS,
  })
  return result === "OK"
}

async function getPendingUserIds(redis: RedisClient): Promise<string[]> {
  const members = await redis.sMembers(PENDING_SET_KEY).catch(() => [])
  return Array.isArray(members) ? members.filter(Boolean) : []
}

async function addPendingUser(
  redis: RedisClient,
  userId: string,
): Promise<void> {
  await redis.sAdd(PENDING_SET_KEY, userId)
}

async function removePendingUser(
  redis: RedisClient,
  userId: string,
): Promise<void> {
  await redis.sRem(PENDING_SET_KEY, userId)
}

function resolveClaimTtlSeconds(offer: FeaturedPromoOffer, now: Date): number {
  const expiresAt = parseIsoDate(offer.expiresAt)
  if (!expiresAt) {
    return Math.max(1, Math.floor(DEFAULT_STATE_TTL_DAYS * 24 * 60 * 60))
  }

  const deltaMs = expiresAt.getTime() - now.getTime()
  if (deltaMs <= 0) return 60

  return Math.max(60, Math.floor(deltaMs / 1000))
}

async function storeClaimToken(args: {
  redis: RedisClient
  token: string
  userId: string
  ttlSeconds: number
}): Promise<void> {
  await args.redis.set(featuredPromoClaimKey(args.token), args.userId, {
    EX: Math.max(1, Math.floor(args.ttlSeconds)),
  })
}

async function countPaidFeaturedCustomers(
  windowStart: Date,
  featuredPlanId: string,
): Promise<number> {
  const rows = await prisma.userPlanPurchase.findMany({
    where: {
      planId: featuredPlanId,
      createdAt: { gte: windowStart },
    },
    select: {
      userId: true,
    },
    distinct: ["userId"],
  })

  return rows.length
}

async function fetchCandidates(
  now: Date,
  windowDays: number,
): Promise<PromoCandidate[]> {
  const windowStart = new Date(now.getTime() - windowDays * DAY_MS)

  const [upvoteRows, products] = await Promise.all([
    prisma.productUpvote.groupBy({
      by: ["productId"],
      where: {
        createdAt: { gte: windowStart },
        product: { status: "published" },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 250,
    }),
    prisma.product.findMany({
      where: { status: "published" },
      select: {
        id: true,
        slug: true,
        name: true,
        userId: true,
        createdAt: true,
        plan: { select: { isDefault: true } },
        user: {
          select: {
            id: true,
            clerkId: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    }),
  ])

  if (!products.length) return []

  const trafficByProductId = await getProductTrafficMapFromGa({
    products: products.map((product: { id: string; slug: string }) => ({
      id: product.id,
      slug: product.slug,
    })),
    dateRange: resolveGaDateRange(now, windowDays),
  })

  const upvotesByProductId = new Map<string, number>()
  for (const row of upvoteRows) {
    upvotesByProductId.set(row.productId, Number(row._count?.productId ?? 0))
  }

  const byUserId = new Map<string, PromoCandidate>()

  for (const product of products) {
    if (!product.user || product.user.status !== "active") continue
    if (!product.user.clerkId || !product.user.email) continue

    const isDefaultPlan = product.plan?.isDefault ?? true
    if (!isDefaultPlan) continue

    const trafficEntry = trafficByProductId.get(product.id)
    const traffic7d = Math.max(0, Math.round(trafficEntry?.pageViews ?? 0))
    const upvotes7d = upvotesByProductId.get(product.id) ?? 0

    if (traffic7d <= 0 && upvotes7d <= 0) continue

    const score = computeIntentScore({ traffic7d, upvotes7d })

    const candidate: PromoCandidate = {
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      user: {
        id: product.user.id,
        clerkId: product.user.clerkId,
        email: product.user.email,
        firstName: product.user.firstName,
        lastName: product.user.lastName,
      },
      metrics: {
        traffic7d,
        upvotes7d,
        score,
      },
    }

    const existing = byUserId.get(product.userId)
    if (!existing || candidate.metrics.score > existing.metrics.score) {
      byUserId.set(product.userId, candidate)
    }
  }

  return Array.from(byUserId.values()).sort(
    (a, b) => b.metrics.score - a.metrics.score,
  )
}

async function resolvePendingOfferRecipient(userId: string): Promise<{
  userId: string
  clerkId: string
  email: string
  firstName: string | null
  lastName: string | null
} | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      clerkId: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  })

  if (!row || row.status !== "active") return null
  if (!row.clerkId || !row.email) return null

  return {
    userId: row.id,
    clerkId: row.clerkId,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
  }
}

async function prepareOffer(args: {
  now: Date
  candidate: PromoCandidate
  plan: { id: string; slug: string; externalId: string }
  discountPct: number
}): Promise<FeaturedPromoOffer> {
  const validHours = computeDiscountValidHours(args.discountPct)
  const expiresAt = new Date(args.now.getTime() + validHours * HOUR_MS)
  const amountBps = Math.round(args.discountPct * 100)

  const discount = await dodoClient.discounts.create({
    amount: amountBps,
    type: "percentage",
    usage_limit: 1,
    expires_at: expiresAt.toISOString(),
    restricted_to: [args.plan.externalId],
    name: `${siteConfig.name} Featured Promo ${args.discountPct}%`,
  })

  const transactionId = `promo_featured:${args.candidate.user.id}:${discount.discount_id}`

  return {
    planId: args.plan.id,
    planSlug: args.plan.slug,
    productId: args.candidate.productId,
    productSlug: args.candidate.productSlug,
    productName: args.candidate.productName,
    discountId: discount.discount_id,
    discountCode: discount.code,
    discountPct: args.discountPct,
    checkoutUrl: null,
    transactionId,
    claimToken: createClaimToken(),
    createdAt: args.now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    notifiedAt: null,
  }
}

async function notifyOffer(args: {
  offer: FeaturedPromoOffer
  candidate: PromoCandidate
  cooldownDays: number
  plan: {
    slug: string
    name: string
    description: string | null
    boostForDays: number
    priceCents: number
    currencyCode: string
    highlights: Array<{ key: string; name: string; description: string }>
  }
}): Promise<NotifyOfferResult> {
  const recipient = toNovuSubscriberInput({
    subscriberId: args.candidate.user.clerkId,
    email: args.candidate.user.email,
    firstName: args.candidate.user.firstName,
    lastName: args.candidate.user.lastName,
  })
  if (!recipient) return { ok: false, reason: "missing-recipient" }
  if (!args.offer.claimToken) {
    return { ok: false, reason: "missing-claim-token" }
  }

  const siteUrl = resolveSiteUrl()
  let claimUrl: string | null = null
  claimUrl = new URL(
    `/api/promotions/featured/claim?token=${encodeURIComponent(args.offer.claimToken)}`,
    `${siteUrl}/`,
  ).toString()
  const publicUrl = new URL(
    productPath(args.offer.productSlug),
    `${siteUrl}/`,
  ).toString()

  const discountedPriceCents = Math.max(
    0,
    Math.round(args.plan.priceCents * (1 - args.offer.discountPct / 100)),
  )
  const validDays = resolveOfferValidDays(args.offer)

  const sent = await sendFeaturedPlanPromotionNotification({
    recipient,
    transactionId: args.offer.transactionId,
    payload: {
      promotion: {
        kind: "featured_plan_promo",
        discountPct: args.offer.discountPct,
        discountCode: args.offer.discountCode,
        expiresAt: args.offer.expiresAt,
        redeemLimit: 1,
        validDays,
        cooldownDays: Math.max(0, Math.floor(args.cooldownDays)),
        provider: "dodo",
      },
      plan: {
        slug: args.plan.slug,
        name: args.plan.name,
        description: args.plan.description,
        boostForDays: args.plan.boostForDays,
        priceCents: args.plan.priceCents,
        discountedPriceCents,
        currencyCode: args.plan.currencyCode,
        highlights: args.plan.highlights,
      },
      product: {
        id: args.offer.productId,
        slug: args.offer.productSlug,
        name: args.offer.productName,
      },
      instructions: {
        steps: [
          "Open the checkout link",
          `Complete payment to unlock ${args.plan.name}`,
        ],
      },
      cta: {
        label: "Boost my listing",
        url: claimUrl,
      },
      links: {
        upgrade: claimUrl,
        public: publicUrl,
      },
      context: {
        metrics: {
          traffic7d: args.candidate.metrics.traffic7d,
          upvotes7d: args.candidate.metrics.upvotes7d,
          score: Number((args.candidate.metrics.score * 100).toFixed(2)),
        },
      },
    },
  })
  if (!sent) return { ok: false, reason: "send-failed" }

  return { ok: true }
}

export async function runFeaturedPlanPromoCron(request?: {
  searchParams?: URLSearchParams
  now?: Date
}): Promise<FeaturedPlanPromoRunResult> {
  const now = request?.now ?? new Date()
  const sp = request?.searchParams
  const dryRun = parseBoolParam(sp?.get("dryRun"))
  const skipLock = !IS_PROD && parseBoolParam(sp?.get("skipLock"))
  const cooldownDays =
    Number.parseInt(sp?.get("cooldownDays") || "", 10) || DEFAULT_COOLDOWN_DAYS
  const dailyMax =
    Number.parseInt(sp?.get("max") || "", 10) || DEFAULT_DAILY_MAX_RECIPIENTS
  const windowDays =
    Number.parseInt(sp?.get("windowDays") || "", 10) ||
    DEFAULT_ACTIVITY_WINDOW_DAYS

  const reasons: Record<string, number> = {}
  const sample: FeaturedPlanPromoRunResult["sample"] = []

  const redis = await getRedisClient()
  if (!redis) {
    recordReason(reasons, "missing-redis")
    return {
      success: false,
      dryRun,
      runDay: getUtcDayKey(now),
      plan: {
        id: "",
        slug: FEATURED_PLAN_SLUG,
        externalId: "",
        boostForDays: 0,
        discountPct: null,
      },
      slots: { dailyMax, paidFeaturedCustomers: 0, available: 0 },
      windowDays,
      cooldownDays,
      candidates: 0,
      pendingOffers: 0,
      prepared: 0,
      notified: 0,
      skipped: 0,
      reasons,
      sample,
    }
  }

  const runDay = getUtcDayKey(now)
  if (!dryRun) {
    if (!skipLock) {
      const locked = await ensureRunLock(redis, runDay)
      if (!locked) {
        recordReason(reasons, "already-ran")
        return {
          success: true,
          dryRun,
          runDay,
          plan: {
            id: "",
            slug: FEATURED_PLAN_SLUG,
            externalId: "",
            boostForDays: 0,
            discountPct: null,
          },
          slots: { dailyMax, paidFeaturedCustomers: 0, available: 0 },
          windowDays,
          cooldownDays,
          candidates: 0,
          pendingOffers: 0,
          prepared: 0,
          notified: 0,
          skipped: 0,
          reasons,
          sample,
        }
      }
    } else {
      recordReason(reasons, "skip-lock")
    }
  }

  const plan = await prisma.plan.findUnique({
    where: { slug: FEATURED_PLAN_SLUG },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      price: true,
      externalId: true,
      boostForDays: true,
      discount: true,
      assignments: {
        where: { enabled: true },
        select: {
          feature: { select: { key: true, name: true, description: true } },
        },
      },
    },
  })
  if (!plan?.id || !plan.externalId) {
    recordReason(reasons, "missing-featured-plan")
    return {
      success: false,
      dryRun,
      runDay,
      plan: {
        id: plan?.id ?? "",
        slug: plan?.slug ?? FEATURED_PLAN_SLUG,
        externalId: plan?.externalId ?? "",
        boostForDays: plan?.boostForDays ?? 0,
        discountPct: typeof plan?.discount === "number" ? plan.discount : null,
      },
      slots: { dailyMax, paidFeaturedCustomers: 0, available: 0 },
      windowDays,
      cooldownDays,
      candidates: 0,
      pendingOffers: 0,
      prepared: 0,
      notified: 0,
      skipped: 0,
      reasons,
      sample,
    }
  }

  const planDiscountPct =
    typeof plan.discount === "number" && Number.isFinite(plan.discount)
      ? plan.discount
      : null

  if (planDiscountPct && planDiscountPct > 0) {
    recordReason(reasons, "plan-discounted")
    return {
      success: true,
      dryRun,
      runDay,
      plan: {
        id: plan.id,
        slug: plan.slug,
        externalId: plan.externalId,
        boostForDays: plan.boostForDays ?? 0,
        discountPct: planDiscountPct,
      },
      slots: { dailyMax, paidFeaturedCustomers: 0, available: 0 },
      windowDays,
      cooldownDays,
      candidates: 0,
      pendingOffers: 0,
      prepared: 0,
      notified: 0,
      skipped: 0,
      reasons,
      sample,
    }
  }

  const boostForDays = plan.boostForDays ?? 0

  const assignments = (plan.assignments ?? []) as Array<{
    feature: { key: string; name: string; description: string }
  }>
  const highlights = assignments
    .map((assignment) => assignment.feature)
    .map((feature) => ({
      key: feature.key,
      name: feature.name,
      description: feature.description,
    }))

  const promoPlan = {
    slug: plan.slug,
    name: plan.name,
    description: plan.description ?? null,
    boostForDays,
    priceCents: plan.price,
    currencyCode: "USD",
    highlights,
  }
  const paidWindowStart = new Date(now.getTime() - DAY_MS)
  const paidFeaturedCustomers = await countPaidFeaturedCustomers(
    paidWindowStart,
    plan.id,
  )
  const availableSlots = Math.max(
    0,
    Math.floor(dailyMax) - Math.max(0, paidFeaturedCustomers),
  )

  if (availableSlots <= 0) {
    recordReason(reasons, "no-slots")
    return {
      success: true,
      dryRun,
      runDay,
      plan: {
        id: plan.id,
        slug: plan.slug,
        externalId: plan.externalId,
        boostForDays: plan.boostForDays ?? 0,
        discountPct: planDiscountPct,
      },
      slots: { dailyMax, paidFeaturedCustomers, available: 0 },
      windowDays,
      cooldownDays,
      candidates: 0,
      pendingOffers: 0,
      prepared: 0,
      notified: 0,
      skipped: 0,
      reasons,
      sample,
    }
  }

  const pendingUserIds = await getPendingUserIds(redis)
  let sendBudget = availableSlots
  let prepared = 0
  let notified = 0
  let skipped = 0

  const processUser = async (
    candidate: PromoCandidate,
    state: FeaturedPromoState | null,
  ) => {
    if (isWithinCooldown(state?.lastNotifiedAt ?? null, now, cooldownDays)) {
      skipped += 1
      recordReason(reasons, "cooldown")
      return
    }

    const attempts = state?.attempts ?? 0
    const metrics: CandidateMetrics = {
      traffic7d: candidate.metrics.traffic7d,
      upvotes7d: candidate.metrics.upvotes7d,
      score: candidate.metrics.score,
    }
    if (metrics.traffic7d <= 0 && metrics.upvotes7d <= 0) {
      skipped += 1
      recordReason(reasons, "no-activity")
      return
    }
    const discountPct = computeDiscountPct({ metrics, attempts })

    sample.push({
      productSlug: candidate.productSlug,
      discountPct,
      traffic7d: metrics.traffic7d,
      upvotes7d: metrics.upvotes7d,
    })

    if (dryRun) {
      skipped += 1
      recordReason(reasons, "dry-run")
      return
    }

    const existingOffer = state?.offer
    const offerExpiresAt = parseIsoDate(existingOffer?.expiresAt ?? null)
    const hasValidOffer =
      existingOffer &&
      !existingOffer.notifiedAt &&
      offerExpiresAt &&
      offerExpiresAt > now

    let offer = existingOffer ?? null

    if (!hasValidOffer) {
      try {
        const score = computeIntentScore(metrics)
        const preparedOffer = await prepareOffer({
          now,
          candidate: {
            ...candidate,
            metrics: { ...metrics, score },
          },
          plan: {
            id: plan.id,
            slug: plan.slug,
            externalId: plan.externalId,
          },
          discountPct,
        })
        offer = preparedOffer
        prepared += 1
        recordReason(reasons, "prepared")

        const nextState: FeaturedPromoState = {
          version: FEATURED_PROMO_VERSION,
          userId: candidate.user.id,
          attempts,
          lastNotifiedAt: state?.lastNotifiedAt ?? null,
          offer,
        }
        await storePromoState(
          redis,
          candidate.user.id,
          nextState,
          DEFAULT_STATE_TTL_DAYS,
        )
        await addPendingUser(redis, candidate.user.id)
      } catch (error) {
        skipped += 1
        recordReason(reasons, "prepare-failed")
        console.error("[promotions.featured] failed to prepare offer", {
          error,
          userId: candidate.user.id,
          productId: candidate.productId,
        })
        return
      }
    }

    if (!offer) {
      skipped += 1
      recordReason(reasons, "missing-offer")
      return
    }

    if (!offer.claimToken) {
      skipped += 1
      recordReason(reasons, "missing-claim-token")
      return
    }

    try {
      await storeClaimToken({
        redis,
        token: offer.claimToken,
        userId: candidate.user.id,
        ttlSeconds: resolveClaimTtlSeconds(offer, now),
      })
    } catch (error) {
      skipped += 1
      recordReason(reasons, "claim-token-failed")
      console.error("[promotions.featured] failed to store claim token", {
        error,
        userId: candidate.user.id,
        productId: candidate.productId,
      })
      return
    }

    try {
      const notification = await notifyOffer({
        offer,
        candidate,
        cooldownDays,
        plan: promoPlan,
      })
      if (!notification.ok) {
        skipped += 1
        recordReason(reasons, "notify-failed")
        console.warn("[promotions.featured] notify returned false", {
          userId: candidate.user.id,
          productId: candidate.productId,
          transactionId: offer.transactionId,
          reason: notification.reason,
        })
        return
      }

      notified += 1
      recordReason(reasons, "notified")

      const nextState: FeaturedPromoState = {
        version: FEATURED_PROMO_VERSION,
        userId: candidate.user.id,
        attempts: attempts + 1,
        lastNotifiedAt: now.toISOString(),
        offer: { ...offer, notifiedAt: now.toISOString() },
      }
      await storePromoState(
        redis,
        candidate.user.id,
        nextState,
        DEFAULT_STATE_TTL_DAYS,
      )
      await removePendingUser(redis, candidate.user.id)
    } catch (error) {
      skipped += 1
      recordReason(reasons, "notify-error")
      console.error("[promotions.featured] failed to notify offer", {
        error,
        userId: candidate.user.id,
        productId: candidate.productId,
      })
    }
  }

  for (const pendingUserId of pendingUserIds) {
    if (sendBudget <= 0) break

    const state = await loadPromoState(redis, pendingUserId)
    const offer = state?.offer
    const expiresAt = parseIsoDate(offer?.expiresAt ?? null)

    if (
      !state ||
      !offer ||
      offer.notifiedAt ||
      !expiresAt ||
      expiresAt <= now
    ) {
      await removePendingUser(redis, pendingUserId).catch(() => {})
      recordReason(reasons, "pending-expired")
      continue
    }

    const recipientDetails = await resolvePendingOfferRecipient(pendingUserId)
    if (!recipientDetails) {
      await removePendingUser(redis, pendingUserId).catch(() => {})
      recordReason(reasons, "pending-missing-details")
      continue
    }

    const candidate: PromoCandidate = {
      productId: offer.productId,
      productSlug: offer.productSlug,
      productName: offer.productName,
      user: {
        id: recipientDetails.userId,
        clerkId: recipientDetails.clerkId,
        email: recipientDetails.email,
        firstName: recipientDetails.firstName,
        lastName: recipientDetails.lastName,
      },
      metrics: {
        traffic7d: 0,
        upvotes7d: 0,
        score: 0,
      },
    }

    await processUser(candidate, state)
    sendBudget -= 1
  }

  if (sendBudget > 0) {
    const candidates = await fetchCandidates(now, windowDays)

    for (const candidate of candidates) {
      if (sendBudget <= 0) break

      const state = await loadPromoState(redis, candidate.user.id)
      await processUser(candidate, state)
      sendBudget -= 1
    }

    return {
      success: true,
      dryRun,
      runDay,
      plan: {
        id: plan.id,
        slug: plan.slug,
        externalId: plan.externalId,
        boostForDays: plan.boostForDays ?? 0,
        discountPct: planDiscountPct,
      },
      slots: { dailyMax, paidFeaturedCustomers, available: availableSlots },
      windowDays,
      cooldownDays,
      candidates: candidates.length,
      pendingOffers: pendingUserIds.length,
      prepared,
      notified,
      skipped,
      reasons,
      sample: sample.slice(0, 25),
    }
  }

  return {
    success: true,
    dryRun,
    runDay,
    plan: {
      id: plan.id,
      slug: plan.slug,
      externalId: plan.externalId,
      boostForDays: plan.boostForDays ?? 0,
      discountPct: planDiscountPct,
    },
    slots: { dailyMax, paidFeaturedCustomers, available: availableSlots },
    windowDays,
    cooldownDays,
    candidates: 0,
    pendingOffers: pendingUserIds.length,
    prepared,
    notified,
    skipped,
    reasons,
    sample: sample.slice(0, 25),
  }
}
