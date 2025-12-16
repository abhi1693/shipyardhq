import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { getRedisClient, type RedisClient } from "@/lib/server/redis"
import { buildCacheKey } from "@/lib/server/cache"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { memberProductUpgradePath, productPath } from "@/lib/routes"
import { toNovuSubscriberInput } from "@/lib/server/notifications/novu"
import { sendFeaturedPlanPromotionNotification } from "@/lib/server/notifications/novuPromotions"

const DAY_MS = 86_400_000

const FEATURED_PLAN_SLUG = "featured"
const PROMO_VERSION = 1

const DEFAULT_DAILY_MAX_RECIPIENTS = 3
const DEFAULT_COOLDOWN_DAYS = 60
const DEFAULT_DISCOUNT_VALID_DAYS = 3
const DEFAULT_ACTIVITY_WINDOW_DAYS = 7

const DEFAULT_STATE_TTL_DAYS = 365
const RUN_LOCK_TTL_SECONDS = 60 * 60 * 25

const PENDING_SET_KEY = buildCacheKey(
  "promotions",
  "featured",
  "pending",
  `v${PROMO_VERSION}`,
)

type FeaturedPromoOffer = {
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
  createdAt: string
  expiresAt: string
  notifiedAt: string | null
}

type FeaturedPromoState = {
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
  return buildCacheKey("promotions", "featured", "run", dayKey, `v${PROMO_VERSION}`)
}

function userStateKey(userId: string): string {
  return buildCacheKey("promotions", "featured", "user", userId, `v${PROMO_VERSION}`)
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function isValidState(state: FeaturedPromoState | null): state is FeaturedPromoState {
  if (!state) return false
  if (state.version !== PROMO_VERSION) return false
  if (!state.userId) return false
  if (typeof state.attempts !== "number") return false
  return true
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

function isWithinCooldown(lastNotifiedAt: string | null, now: Date, cooldownDays: number): boolean {
  const notifiedAt = parseIsoDate(lastNotifiedAt)
  if (!notifiedAt) return false
  const cutoffMs = cooldownDays * DAY_MS
  return now.getTime() - notifiedAt.getTime() < cutoffMs
}

function floorToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || step <= 0) return value
  return Math.floor(value / step) * step
}

function computeIntentScore(metrics: { traffic7d: number; upvotes7d: number }): number {
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
  const minPct = 5
  const maxPct = 25
  const bucket = 5

  const intent = clampNumber(args.metrics.score, 0, 1)
  // Protect revenue: bias discounts toward the minimum unless intent is low.
  // This is a convex curve (quadratic) so high-intent users are much more likely
  // to get 5–10%, reserving 20–25% for low-intent segments.
  const base = minPct + (1 - intent) * (1 - intent) * (maxPct - minPct)

  // Escalate cautiously when users didn't convert in prior cycles; scale the
  // increase by (1-intent) so high-intent users don't get large discounts.
  const attemptFactor = clampNumber(1 - intent, 0, 1)
  const attemptBonus = clampNumber(Math.floor(args.attempts) * 5 * attemptFactor, 0, 10)
  const withBonus = base + attemptBonus

  // Round down to protect revenue; still clamp to 5–25.
  const bucketed = floorToStep(withBonus, bucket)
  return clampNumber(bucketed, minPct, maxPct)
}

async function loadPromoState(
  redis: RedisClient,
  userId: string,
): Promise<FeaturedPromoState | null> {
  const raw = await redis.get(userStateKey(userId))
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
  await redis.set(userStateKey(userId), JSON.stringify(state), { EX: ttlSeconds })
}

async function ensureRunLock(redis: RedisClient, dayKey: string): Promise<boolean> {
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

async function addPendingUser(redis: RedisClient, userId: string): Promise<void> {
  await redis.sAdd(PENDING_SET_KEY, userId)
}

async function removePendingUser(redis: RedisClient, userId: string): Promise<void> {
  await redis.sRem(PENDING_SET_KEY, userId)
}

async function countPaidFeaturedCustomers(windowStart: Date, featuredPlanId: string): Promise<number> {
  const rows = await prisma.product.findMany({
    where: {
      planId: featuredPlanId,
      planAssignedAt: { gte: windowStart },
      status: "published",
    },
    select: {
      userId: true,
    },
    distinct: ["userId"],
  })

  return rows.length
}

async function fetchCandidates(now: Date, windowDays: number): Promise<PromoCandidate[]> {
  const windowStart = new Date(now.getTime() - windowDays * DAY_MS)

  const [trafficRows, upvoteRows] = await Promise.all([
    prisma.productTrafficEvent.groupBy({
      by: ["productId"],
      where: {
        createdAt: { gte: windowStart },
        isBot: false,
      },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 250,
    }),
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
  ])

  const trafficByProductId = new Map<string, number>()
  const upvotesByProductId = new Map<string, number>()

  for (const row of trafficRows) {
    trafficByProductId.set(row.productId, Number(row._count?.productId ?? 0))
  }
  for (const row of upvoteRows) {
    upvotesByProductId.set(row.productId, Number(row._count?.productId ?? 0))
  }

  const productIds = Array.from(
    new Set([...trafficByProductId.keys(), ...upvotesByProductId.keys()]),
  )
  if (!productIds.length) return []

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "published" },
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
  })

  const byUserId = new Map<string, PromoCandidate>()

  for (const product of products) {
    if (!product.user || product.user.status !== "active") continue
    if (!product.user.clerkId || !product.user.email) continue

    const isDefaultPlan = product.plan?.isDefault ?? true
    if (!isDefaultPlan) continue

    const traffic7d = trafficByProductId.get(product.id) ?? 0
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

  return Array.from(byUserId.values()).sort((a, b) => b.metrics.score - a.metrics.score)
}

async function resolvePendingOfferRecipient(
  userId: string,
): Promise<{
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
  const expiresAt = new Date(args.now.getTime() + DEFAULT_DISCOUNT_VALID_DAYS * DAY_MS)
  const amountBps = Math.round(args.discountPct * 100)

  const discount = await dodoClient.discounts.create({
    amount: amountBps,
    type: "percentage",
    usage_limit: 1,
    expires_at: expiresAt.toISOString(),
    restricted_to: [args.plan.externalId],
    name: `Shipyard Featured Promo ${args.discountPct}%`,
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
}): Promise<boolean> {
  const recipient = toNovuSubscriberInput({
    subscriberId: args.candidate.user.clerkId,
    email: args.candidate.user.email,
    firstName: args.candidate.user.firstName,
    lastName: args.candidate.user.lastName,
  })
  if (!recipient) return false

  const siteUrl = resolveSiteUrl()
  const upgradeUrl = new URL(
    memberProductUpgradePath(args.offer.productSlug),
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

  return sendFeaturedPlanPromotionNotification({
    recipient,
    transactionId: args.offer.transactionId,
    payload: {
      promotion: {
        kind: "featured_plan_promo",
        discountPct: args.offer.discountPct,
        discountCode: args.offer.discountCode,
        expiresAt: args.offer.expiresAt,
        redeemLimit: 1,
        validDays: DEFAULT_DISCOUNT_VALID_DAYS,
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
          "Open your product’s upgrade page",
          `Choose the ${args.plan.name} plan`,
          `Enter code ${args.offer.discountCode} at checkout`,
        ],
      },
      cta: {
        label: "Boost my listing",
        url: upgradeUrl,
      },
      links: {
        upgrade: upgradeUrl,
        public: publicUrl,
      },
      context: {
        metrics: {
          traffic7d: args.candidate.metrics.traffic7d,
          upvotes7d: args.candidate.metrics.upvotes7d,
          score: args.candidate.metrics.score,
        },
      },
    },
  })
}

export async function runFeaturedPlanPromoCron(request?: {
  searchParams?: URLSearchParams
  now?: Date
}): Promise<FeaturedPlanPromoRunResult> {
  const now = request?.now ?? new Date()
  const sp = request?.searchParams
  const dryRun = parseBoolParam(sp?.get("dryRun"))
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

  const highlightKeys = ["featured", "priorityPlacement", "sponsoredProducts"] as const
  const assignments = (plan.assignments ?? []) as Array<{
    feature: { key: string; name: string; description: string }
  }>
  const enabledFeatures = assignments.map((assignment) => assignment.feature)
  const featureByKey = new Map(
    enabledFeatures.map((feature) => [feature.key, feature]),
  )
  const highlights = highlightKeys
    .map((key) => featureByKey.get(key))
    .filter(
      (
        feature,
      ): feature is { key: string; name: string; description: string } =>
        Boolean(feature),
    )
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
  const paidFeaturedCustomers = await countPaidFeaturedCustomers(paidWindowStart, plan.id)
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

  const processUser = async (candidate: PromoCandidate, state: FeaturedPromoState | null) => {
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
          version: PROMO_VERSION,
          userId: candidate.user.id,
          attempts,
          lastNotifiedAt: state?.lastNotifiedAt ?? null,
          offer,
        }
        await storePromoState(redis, candidate.user.id, nextState, DEFAULT_STATE_TTL_DAYS)
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

    try {
      const sent = await notifyOffer({
        offer,
        candidate,
        cooldownDays,
        plan: promoPlan,
      })
      if (!sent) {
        skipped += 1
        recordReason(reasons, "notify-failed")
        return
      }

      notified += 1
      recordReason(reasons, "notified")

      const nextState: FeaturedPromoState = {
        version: PROMO_VERSION,
        userId: candidate.user.id,
        attempts: attempts + 1,
        lastNotifiedAt: now.toISOString(),
        offer: { ...offer, notifiedAt: now.toISOString() },
      }
      await storePromoState(redis, candidate.user.id, nextState, DEFAULT_STATE_TTL_DAYS)
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

    if (!state || !offer || offer.notifiedAt || !expiresAt || expiresAt <= now) {
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
