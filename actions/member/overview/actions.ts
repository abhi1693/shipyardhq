import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { subDays } from "date-fns"

type UserRef = { id: string }

async function getCurrentUser(): Promise<UserRef> {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthenticated")
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })
  if (!user) throw new Error("User not found")
  return user
}

export async function getUserDashboardStats(days = 7) {
  const user = await getCurrentUser()

  const since = subDays(new Date(), days)

  const [products, productsInRange, draftsCount, unverifiedCount] =
    await Promise.all([
      prisma.product.findMany({
        where: { userId: user.id },
        include: {
          verification: { select: { isVerified: true } },
          analytics: { select: { clicks: true, upvotes: true } },
          plan: { select: { id: true, name: true, price: true } },
        },
      }),
      prisma.product.count({
        where: {
          userId: user.id,
          createdAt: { gte: since },
        },
      }),
      prisma.product.count({ where: { userId: user.id, status: "draft" } }),
      prisma.product.count({
        where: { userId: user.id, verification: { isVerified: false } },
      }),
    ])

  const totalProducts = products.length
  const verifiedDomains = products.filter(
    (p) => p.verification?.isVerified,
  ).length

  const totalClicks = products.reduce(
    (sum, p) => sum + (p.analytics?.clicks || 0),
    0,
  )

  const totalUpvotes = products.reduce(
    (sum, p) => sum + (p.analytics?.upvotes || 0),
    0,
  )

  const verifiedRate =
    totalProducts > 0 ? Math.round((verifiedDomains / totalProducts) * 100) : 0

  // Extract latest plan from the most recent product
  const latestProduct = products[0]
  const plan = latestProduct?.plan ?? null

  return {
    totalProducts,
    productsInRange,
    draftsCount,
    unverifiedCount,
    verifiedDomains,
    verifiedRate,
    totalClicks,
    totalUpvotes,
    plan,
  }
}

export async function getUserProducts(limit = 10, days?: number) {
  const user = await getCurrentUser()

  const where: any = { userId: user.id }
  if (days) {
    where.createdAt = { gte: subDays(new Date(), days) }
  }

  return prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      plan: { select: { name: true } },
      verification: { select: { isVerified: true } },
      analytics: { select: { clicks: true, upvotes: true } },
    },
  })
}

// New: Unverified products (with expected TXT)
export async function getUnverifiedProducts(limit = 3) {
  const user = await getCurrentUser()
  const products = await prisma.product.findMany({
    where: { userId: user.id, verification: { isVerified: false } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      verification: { select: { isVerified: true, verificationTxt: true } },
      analytics: { select: { clicks: true, upvotes: true } },
    },
  })
  return products
}

// New: Latest drafts
export async function getUserDrafts(limit = 3) {
  const user = await getCurrentUser()
  return prisma.product.findMany({
    where: { userId: user.id, status: "draft" },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      updatedAt: true,
    },
  })
}

// New: Top products by metric in range
export async function getTopProductsByMetric(
  metric: "clicks" | "upvotes",
  limit = 3,
  days?: number,
) {
  const user = await getCurrentUser()
  const where: any = { userId: user.id }
  if (days) where.createdAt = { gte: subDays(new Date(), days) }

  const orderBy =
    metric === "clicks"
      ? { analytics: { clicks: "desc" as const } }
      : { analytics: { upvotes: "desc" as const } }

  const products = await prisma.product.findMany({
    where,
    orderBy,
    take: limit,
    include: {
      analytics: { select: { clicks: true, upvotes: true } },
    },
  })
  return products
}

// New: Expiring badges soon
export async function getExpiringBadges(limit = 5, withinDays = 14) {
  const user = await getCurrentUser()
  const until = subDays(new Date(), -withinDays) // now + withinDays
  const rows = await prisma.productBadge.findMany({
    where: {
      product: { userId: user.id },
      expiresAt: { not: null, lte: until },
    },
    orderBy: { expiresAt: "asc" },
    take: limit,
    select: {
      id: true,
      badge: true,
      expiresAt: true,
      product: { select: { id: true, name: true, slug: true } },
    },
  })
  return rows
}

// New: Products needing media (lt min images)
export async function getProductsNeedingMedia(min = 2, limit = 5) {
  const user = await getCurrentUser()
  const products = await prisma.product.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50, // sample and then filter
    select: {
      id: true,
      name: true,
      slug: true,
      updatedAt: true,
      _count: { select: { ProductMedia: true } },
    },
  })
  return products.filter((p) => (p as any)._count.ProductMedia < min).slice(0, limit)
}

// New: Recent activity (derived from existing tables)
export async function getRecentActivity(days = 7, limit = 10) {
  const user = await getCurrentUser()
  const since = subDays(new Date(), days)

  const [created, updated, verified, badges, upvotes] = await Promise.all([
    prisma.product.findMany({
      where: { userId: user.id, createdAt: { gte: since } },
      select: { id: true, name: true, slug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.product.findMany({
      where: { userId: user.id, updatedAt: { gte: since } },
      select: { id: true, name: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.productVerification.findMany({
      where: {
        product: { userId: user.id },
        verifiedAt: { not: null, gte: since },
      },
      select: {
        product: { select: { id: true, name: true, slug: true } },
        verifiedAt: true,
      },
      orderBy: { verifiedAt: "desc" },
      take: limit,
    }),
    prisma.productBadge.findMany({
      where: { product: { userId: user.id }, createdAt: { gte: since } },
      select: {
        id: true,
        badge: true,
        createdAt: true,
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.productUpvote.findMany({
      where: { product: { userId: user.id }, createdAt: { gte: since } },
      select: {
        id: true,
        createdAt: true,
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ])

  type Activity = {
    type:
      | "product_created"
      | "product_updated"
      | "domain_verified"
      | "badge_assigned"
      | "product_upvoted"
    ts: Date
    product: { id: string; name: string; slug: string }
    meta?: any
  }

  const list: Activity[] = []
  created.forEach((p) =>
    list.push({ type: "product_created", ts: p.createdAt, product: p }),
  )
  updated.forEach((p) =>
    list.push({ type: "product_updated", ts: p.updatedAt, product: p }),
  )
  verified.forEach((v) =>
    list.push({
      type: "domain_verified",
      ts: v.verifiedAt!,
      product: v.product,
    }),
  )
  badges.forEach((b) =>
    list.push({
      type: "badge_assigned",
      ts: b.createdAt,
      product: b.product,
      meta: { badge: b.badge },
    }),
  )
  upvotes.forEach((u) =>
    list.push({ type: "product_upvoted", ts: u.createdAt, product: u.product }),
  )

  list.sort((a, b) => b.ts.getTime() - a.ts.getTime())
  return list.slice(0, limit)
}

// New: Health summary across products
export async function getProductHealthSummary(days?: number) {
  const user = await getCurrentUser()
  const where: any = { userId: user.id }
  if (days) where.createdAt = { gte: subDays(new Date(), days) }

  const products = await prisma.product.findMany({
    where,
    include: {
      verification: { select: { isVerified: true } },
      metadata: {
        select: {
          githubUrl: true,
          twitterUrl: true,
          demoUrl: true,
          contactEmail: true,
        },
      },
      _count: { select: { ProductMedia: true } },
    },
  })

  const issuesCount: Record<string, number> = {
    unverified: 0,
    missingBanner: 0,
    lowMedia: 0,
    shortDescription: 0,
    noKeywords: 0,
    missingCta: 0,
  }

  const perProductIssues: Record<string, string[]> = {}

  function scoreProduct(p: typeof products[number]) {
    let score = 0
    const issues: string[] = []
    // Logo
    if (p.logo) score += 10
    // Banner
    if (p.bannerImage) score += 10
    else {
      issues.push("Missing banner")
      issuesCount.missingBanner++
    }
    // Description
    if (p.description && p.description.trim().length >= 200) score += 15
    else {
      issues.push("Short description")
      issuesCount.shortDescription++
    }
    // Keywords
    if ((p.keywords || []).length >= 3) score += 10
    else {
      issues.push("Add more keywords")
      issuesCount.noKeywords++
    }
    // CTA
    if (p.ctaLabel && p.ctaUrl) score += 10
    else {
      issues.push("Missing CTA label or URL")
      issuesCount.missingCta++
    }
    // Media
    const mediaCount = (p as any)._count.ProductMedia as number
    if (mediaCount >= 2) score += 15
    else {
      issues.push("Add at least 2 screenshots")
      issuesCount.lowMedia++
    }
    // Verification
    if (p.verification?.isVerified) score += 20
    else {
      issues.push("Domain not verified")
      issuesCount.unverified++
    }
    // Social/links
    const m = p.metadata
    if (m?.githubUrl || m?.twitterUrl || m?.demoUrl || m?.contactEmail) score += 10

    perProductIssues[p.id] = issues
    return Math.min(100, score)
  }

  const scores = products.map(scoreProduct)
  const averageScore = products.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / products.length)
    : 0

  const suggestions: { label: string; count: number; href?: string }[] = []
  if (issuesCount.unverified)
    suggestions.push({
      label: `${issuesCount.unverified} product(s) need domain verification`,
      count: issuesCount.unverified,
      href: "/member/products?verification=unverified",
    })
  if (issuesCount.lowMedia)
    suggestions.push({
      label: `${issuesCount.lowMedia} product(s) should add screenshots`,
      count: issuesCount.lowMedia,
      href: "/member/products",
    })
  if (issuesCount.missingBanner)
    suggestions.push({
      label: `${issuesCount.missingBanner} product(s) missing a banner`,
      count: issuesCount.missingBanner,
      href: "/member/products",
    })
  if (issuesCount.shortDescription)
    suggestions.push({
      label: `${issuesCount.shortDescription} product(s) with short description`,
      count: issuesCount.shortDescription,
      href: "/member/products",
    })
  if (issuesCount.noKeywords)
    suggestions.push({
      label: `${issuesCount.noKeywords} product(s) should add keywords`,
      count: issuesCount.noKeywords,
      href: "/member/products",
    })
  if (issuesCount.missingCta)
    suggestions.push({
      label: `${issuesCount.missingCta} product(s) missing CTA`,
      count: issuesCount.missingCta,
      href: "/member/products",
    })

  const productsNeedingAttention = products
    .map((p) => ({ id: p.id, name: p.name, slug: p.slug, issues: perProductIssues[p.id] }))
    .filter((p) => p.issues.length)
    .slice(0, 3)

  return { averageScore, suggestions, productsNeedingAttention }
}
