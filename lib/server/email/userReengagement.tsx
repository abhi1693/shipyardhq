import { sendEmail } from "@/lib/email/resend"
import UserReengagementEmail from "@/lib/email/templates/outreach/userReengagement"
import { getAppBaseUrl } from "@/lib/email/utils"
import prisma from "@/lib/prisma"
import { getRedisClient } from "@/lib/server/redis"
import { buildCacheKey } from "@/lib/server/cache"
import {
  LEADERBOARD_PATH,
  MEMBER_OVERVIEW_PATH,
  MEMBER_REWARDS_PATH,
} from "@/lib/routes"

const LOGIN_RULE_KEY = "rewards.login.daily"
const REENGAGEMENT_MILESTONES = [90]
const DAY_IN_MS = 24 * 60 * 60 * 1000
const REDIS_TTL_SECONDS = 60 * 60 * 24 * 365 // roughly a year

function normalizeDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function calculateDaysSince(reference: Date, comparison: Date) {
  const referenceDay = normalizeDay(reference)
  const comparisonDay = normalizeDay(comparison)
  if (comparisonDay.getTime() > referenceDay.getTime()) {
    return 0
  }
  const diff = referenceDay.getTime() - comparisonDay.getTime()
  return Math.floor(diff / DAY_IN_MS)
}

function formatName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean)
  if (!parts.length) return "there"
  return parts.join(" ")
}

function buildAbsoluteUrl(path: string) {
  const base = getAppBaseUrl()
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

function buildRedisKey(userId: string, milestone: number) {
  return buildCacheKey("user", "reengagement", milestone, userId)
}

export async function sendUserReengagementEmails(now: Date = new Date()) {
  const users = await prisma.user.findMany({
    where: {
      status: "active",
      email: { not: "" },
      rewardTransactions: {
        some: {
          ruleKey: LOGIN_RULE_KEY,
        },
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      rewardTransactions: {
        where: { ruleKey: LOGIN_RULE_KEY },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
        },
      },
    },
  })

  if (!users.length) {
    return { sent: 0, skipped: 0 }
  }

  const redis = await getRedisClient()

  let sent = 0
  let skipped = 0

  for (const user of users) {
    const loginRecord = user.rewardTransactions[0]
    if (!loginRecord?.createdAt) {
      skipped += 1
      continue
    }

    const daysSinceLogin = calculateDaysSince(now, loginRecord.createdAt)
    const milestone = REENGAGEMENT_MILESTONES.find(
      (value) => value === daysSinceLogin,
    )
    if (!milestone) {
      continue
    }

    if (redis) {
      try {
        const redisKey = buildRedisKey(user.id, milestone)
        const result = await redis.set(redisKey, now.toISOString(), {
          NX: true,
          EX: REDIS_TTL_SECONDS,
        })
        if (result === null) {
          skipped += 1
          continue
        }
      } catch (error) {
        console.error("[email] user reengagement redis guard failed", {
          userId: user.id,
          error,
        })
      }
    }

    const memberDashboardUrl = buildAbsoluteUrl(MEMBER_OVERVIEW_PATH)
    const memberRewardsUrl = buildAbsoluteUrl(MEMBER_REWARDS_PATH)
    const leaderboardUrl = buildAbsoluteUrl(LEADERBOARD_PATH)
    const userName = formatName(user.firstName, user.lastName)

    try {
      await sendEmail({
        to: user.email!,
        subject:
          milestone === 7
            ? `We saved your spot on Shipyard`
            : `It’s been ${milestone} days — come back aboard`,
        react: (
          <UserReengagementEmail
            userName={userName}
            milestone={milestone}
            memberRewardsUrl={memberRewardsUrl}
            memberDashboardUrl={memberDashboardUrl}
            leaderboardUrl={leaderboardUrl}
          />
        ),
      })
      sent += 1
    } catch (error) {
      skipped += 1
      console.error("[email] user reengagement send failed", {
        userId: user.id,
        error,
      })
    }
  }

  return { sent, skipped }
}
