import prisma from "@/lib/prisma"
import { dodoClient } from "@/lib/dodo"
import { createPlanCheckout } from "@/lib/server/dodoCheckout"
import { buildCacheKey } from "@/lib/server/cache"
import { getRedisClient, type RedisClient } from "@/lib/server/redis"
import { resolveSiteUrl } from "@/lib/siteConfig"
import { memberProductPath, productPath } from "@/lib/routes"
import { registerEventHandler } from "@/lib/server/events"
import { PlanType } from "@/lib/vendor/prisma/client"
import {
  isNovuEnabled,
  toNovuSubscriberInput,
} from "@/lib/server/notifications/novu"
import {
  sendTrendingBoostPromotionNotification,
  type FeaturedPromoPayload,
} from "@/lib/server/notifications/novuPromotions"

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const PROMO_VERSION = 1
const PROMO_PLAN_SLUG = "featured"

const DEFAULT_DISCOUNT_PCT = 10
const DEFAULT_VALID_HOURS = 24
const DEFAULT_COOLDOWN_DAYS = 30
const DEFAULT_STATE_TTL_DAYS = 90

type TrendingBoostOffer = {
  badgeId: string
  planId: string
  planSlug: string
  productId: string
  productSlug: string
  productName: string
  discountId: string
  discountCode: string
  discountPct: number
  checkoutUrl: string
  transactionId: string
  createdAt: string
  expiresAt: string
  notifiedAt: string | null
}

type TrendingBoostState = {
  version: number
  productId: string
  lastNotifiedAt: string | null
  offer: TrendingBoostOffer | null
}

function parseNumberEnv(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
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

function stateKey(productId: string): string {
  return buildCacheKey(
    "promotions",
    "trending",
    "product",
    productId,
    `v${PROMO_VERSION}`,
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
  state: TrendingBoostState | null,
): state is TrendingBoostState {
  if (!state) return false
  if (state.version !== PROMO_VERSION) return false
  if (!state.productId) return false
  return true
}

async function loadState(
  redis: RedisClient,
  productId: string,
): Promise<TrendingBoostState | null> {
  const raw = await redis.get(stateKey(productId))
  const parsed = parseJson<TrendingBoostState>(raw ?? null)
  return isValidState(parsed) ? parsed : null
}

async function storeState(
  redis: RedisClient,
  productId: string,
  state: TrendingBoostState,
  ttlDays: number,
): Promise<void> {
  const ttlSeconds = Math.max(1, Math.floor(ttlDays * 24 * 60 * 60))
  await redis.set(stateKey(productId), JSON.stringify(state), { EX: ttlSeconds })
}

async function prepareOffer(args: {
  now: Date
  badgeId: string
  plan: {
    id: string
    slug: string
    externalId: string
  }
  product: {
    id: string
    slug: string
    name: string
  }
  customer: {
    email: string
    name: string | null
  }
  discountPct: number
  validHours: number
}): Promise<TrendingBoostOffer> {
  const expiresAt = new Date(args.now.getTime() + args.validHours * HOUR_MS)
  const amountBps = Math.round(args.discountPct * 100)

  const discount = await dodoClient.discounts.create({
    amount: amountBps,
    type: "percentage",
    usage_limit: 1,
    expires_at: expiresAt.toISOString(),
    restricted_to: [args.plan.externalId],
    name: `Shipyard Trending Boost ${args.discountPct}%`,
  })

  const transactionId = `promo_trending:${args.product.id}:${args.badgeId}`

  const siteUrl = resolveSiteUrl()
  const returnUrl = new URL(
    memberProductPath(args.product.slug),
    `${siteUrl}/`,
  ).toString()

  const checkout = await createPlanCheckout({
    plan: {
      externalId: args.plan.externalId,
      type: PlanType.one_time_price,
    },
    customer: {
      email: args.customer.email,
      ...(args.customer.name ? { name: args.customer.name } : {}),
    },
    metadata: {
      productId: args.product.id,
      productSlug: args.product.slug,
      planId: args.plan.id,
      planSlug: args.plan.slug,
      promotion: "trending",
      badgeId: args.badgeId,
      discountCode: discount.code,
    },
    returnUrl,
    discountCode: discount.code,
  })

  return {
    badgeId: args.badgeId,
    planId: args.plan.id,
    planSlug: args.plan.slug,
    productId: args.product.id,
    productSlug: args.product.slug,
    productName: args.product.name,
    discountId: discount.discount_id,
    discountCode: discount.code,
    discountPct: args.discountPct,
    checkoutUrl: checkout.url,
    transactionId,
    createdAt: args.now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    notifiedAt: null,
  }
}

async function sendOffer(args: {
  offer: TrendingBoostOffer
  recipient: {
    clerkId: string
    email: string
    firstName: string | null
    lastName: string | null
  }
  plan: {
    id: string
    slug: string
    name: string
    description: string | null
    boostForDays: number
    priceCents: number
    highlights: Array<{ key: string; name: string; description: string }>
  }
  cooldownDays: number
}): Promise<boolean> {
  const subscriber = toNovuSubscriberInput({
    subscriberId: args.recipient.clerkId,
    email: args.recipient.email,
    firstName: args.recipient.firstName,
    lastName: args.recipient.lastName,
  })
  if (!subscriber) return false

  const discountedPriceCents = Math.max(
    0,
    Math.round(args.plan.priceCents * (1 - args.offer.discountPct / 100)),
  )

  const siteUrl = resolveSiteUrl()
  const publicUrl = new URL(
    productPath(args.offer.productSlug),
    `${siteUrl}/`,
  ).toString()

  const payload: FeaturedPromoPayload = {
    // Derive validDays from the offer window so overrides stay consistent.
    // Round up to ensure the message matches the discount expiry.
    ...(() => {
      const createdAt = parseIsoDate(args.offer.createdAt) ?? new Date()
      const expiresAt =
        parseIsoDate(args.offer.expiresAt) ??
        new Date(createdAt.getTime() + DAY_MS)
      const durationMs = Math.max(0, expiresAt.getTime() - createdAt.getTime())
      const validDays = Math.max(1, Math.ceil(durationMs / DAY_MS))

      return {
        promotion: {
          kind: "featured_plan_promo" as const,
          discountPct: args.offer.discountPct,
          discountCode: args.offer.discountCode,
          expiresAt: args.offer.expiresAt,
          redeemLimit: 1,
          validDays,
          cooldownDays: Math.max(0, Math.floor(args.cooldownDays)),
          provider: "dodo" as const,
        },
      }
    })(),
    plan: {
      slug: args.plan.slug,
      name: args.plan.name,
      description: args.plan.description,
      boostForDays: args.plan.boostForDays,
      priceCents: args.plan.priceCents,
      discountedPriceCents,
      currencyCode: "USD",
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
        "Complete payment to extend your boost",
      ],
    },
    cta: {
      label: "Extend my momentum",
      url: args.offer.checkoutUrl,
    },
    links: {
      upgrade: args.offer.checkoutUrl,
      public: publicUrl,
    },
    context: {
      source: "trending_badge",
      badgeId: args.offer.badgeId,
    },
  }

  return sendTrendingBoostPromotionNotification({
    recipient: subscriber,
    transactionId: args.offer.transactionId,
    payload,
  })
}

registerEventHandler({
  event: "badge.assigned",
  id: "promotions.trending-boost",
  queue: "default",
  mode: "async",
  handler: async ({ badge, productId, id: badgeId }) => {
    const normalizedBadge = (badge || "").trim().toLowerCase()
    if (normalizedBadge !== "trending") return

    if (!isNovuEnabled()) {
      console.warn("[promotions.trending] novu disabled; skipping")
      return
    }

    const now = new Date()

    const redis = await getRedisClient()
    if (!redis) {
      console.warn("[promotions.trending] missing redis; skipping")
      return
    }

    const discountPct = clampNumber(
      parseNumberEnv(process.env.PROMOTIONS_TRENDING_DISCOUNT_PCT) ??
        DEFAULT_DISCOUNT_PCT,
      1,
      50,
    )
    const validHours = clampNumber(
      parseNumberEnv(process.env.PROMOTIONS_TRENDING_VALID_HOURS) ??
        DEFAULT_VALID_HOURS,
      1,
      72,
    )
    const cooldownDays = clampNumber(
      parseNumberEnv(process.env.PROMOTIONS_TRENDING_COOLDOWN_DAYS) ??
        DEFAULT_COOLDOWN_DAYS,
      0,
      365,
    )

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        plan: {
          select: {
            isDefault: true,
          },
        },
        user: {
          select: {
            clerkId: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    })

    if (!product || product.status !== "published") return
    if (!product.user || product.user.status !== "active") return
    if (!product.user.clerkId || !product.user.email) return

    const isDefaultPlan = product.plan?.isDefault ?? true
    if (!isDefaultPlan) return

    const plan = await prisma.plan.findUnique({
      where: { slug: PROMO_PLAN_SLUG },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        type: true,
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

    if (!plan?.id || !plan.externalId) return
    if (plan.type !== PlanType.one_time_price) return
    if ((plan.price || 0) <= 0) return
    if (typeof plan.discount === "number" && plan.discount > 0) return

    const state = await loadState(redis, product.id)
    if (isWithinCooldown(state?.lastNotifiedAt ?? null, now, cooldownDays)) {
      return
    }

    const offerExpiresAt = parseIsoDate(state?.offer?.expiresAt ?? null)
    const hasValidOffer =
      state?.offer &&
      offerExpiresAt &&
      offerExpiresAt > now &&
      state.offer.notifiedAt === null

    const highlightKeys = [
      "featured",
      "priorityPlacement",
      "sponsoredProducts",
    ] as const
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

    const offer =
      hasValidOffer && state?.offer
        ? state.offer
        : await prepareOffer({
            now,
            badgeId,
            plan: {
              id: plan.id,
              slug: plan.slug,
              externalId: plan.externalId,
            },
            product: {
              id: product.id,
              slug: product.slug,
              name: product.name,
            },
            customer: {
              email: product.user.email,
              name: `${product.user.firstName ?? ""} ${product.user.lastName ?? ""}`
                .trim()
                .replace(/\s+/g, " ")
                .trim() || null,
            },
            discountPct,
            validHours,
          })

    const nextState: TrendingBoostState = {
      version: PROMO_VERSION,
      productId: product.id,
      lastNotifiedAt: state?.lastNotifiedAt ?? null,
      offer,
    }

    await storeState(redis, product.id, nextState, DEFAULT_STATE_TTL_DAYS)

    const sent = await sendOffer({
      offer,
      recipient: {
        clerkId: product.user.clerkId,
        email: product.user.email,
        firstName: product.user.firstName ?? null,
        lastName: product.user.lastName ?? null,
      },
      plan: {
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        description: plan.description ?? null,
        boostForDays: plan.boostForDays ?? 0,
        priceCents: plan.price,
        highlights,
      },
      cooldownDays,
    })

    if (!sent) {
      console.error("[promotions.trending] failed to send offer", {
        productId: product.id,
        badgeId,
      })
      throw new Error("Failed to send trending promotion notification")
    }

    const notifiedAt = now.toISOString()
    await storeState(
      redis,
      product.id,
      {
        ...nextState,
        lastNotifiedAt: notifiedAt,
        offer: { ...offer, notifiedAt },
      },
      DEFAULT_STATE_TTL_DAYS,
    )
  },
})
