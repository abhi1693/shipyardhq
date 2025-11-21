"use server"

import { createHash, randomInt } from "crypto"
import { Resolver } from "dns/promises"
import { auth } from "@clerk/nextjs/server"

import prisma from "@/lib/prisma"
import { getRootDomain } from "@/lib/domain"
import { generateVerificationTxtFromWebsite } from "@/lib/products/verification"
import { revalidateProduct, revalidateUser } from "@/lib/cache/revalidate"
import { sendEmail } from "@/lib/email/resend"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import type {
  Prisma,
  ProductClaimAttempt,
  ProductClaimStatus,
} from "@/lib/vendor/prisma/client"

const CLAIM_PENDING_WINDOW_MS = 15 * 60 * 1000
const DNS_LOCK_WINDOW_MS = 5 * 60 * 1000

type ClaimableProduct = Prisma.ProductGetPayload<{
  select: {
    id: true
    name: true
    slug: true
    websiteUrl: true
    verification: { select: { verificationTxt: true; isVerified: true } }
  }
}>

type ClaimableProductSummary = {
  id: string
  name: string
  slug: string
  websiteUrl: string
  domain: string
  expectedTxt: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function hashOtp(code: string) {
  const salt = process.env.OTP_SALT ?? ""
  return createHash("sha256").update(`${code}:${salt}`).digest("hex")
}

function generateOtpCode() {
  const num = randomInt(0, 1_000_000)
  return num.toString().padStart(6, "0")
}

function emailMatchesDomain(email: string, rootDomain: string): boolean {
  const [, domain] = email.split("@")
  if (!domain) return false
  const normalizedEmailDomain = domain.toLowerCase()
  const normalizedRoot = rootDomain.toLowerCase()
  return (
    normalizedEmailDomain === normalizedRoot ||
    normalizedEmailDomain.endsWith(`.${normalizedRoot}`)
  )
}

function resolveExpectedTxt(product: ClaimableProduct, domain: string) {
  return (
    product.verification?.verificationTxt ??
    generateVerificationTxtFromWebsite(product.websiteUrl ?? domain)
  )
}

async function getUserOrganizationIds(userId: string) {
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId },
    select: { organizationId: true },
  })
  return memberships.map((m) => m.organizationId)
}

async function getClaimableProductsForViewer(
  userId: string,
  q?: string,
): Promise<ClaimableProductSummary[]> {
  const organizationIds = await getUserOrganizationIds(userId)

  const where: Prisma.ProductWhereInput = {
    verification: { isVerified: false },
    NOT: [
      { userId },
      ...(organizationIds.length
        ? [{ organizationId: { in: organizationIds } }]
        : []),
    ],
  }

  const search = q?.trim()
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { websiteUrl: { contains: search, mode: "insensitive" } },
    ]
  }

  const products = await prisma.product.findMany({
    where,
    take: 50,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      websiteUrl: true,
      verification: { select: { verificationTxt: true, isVerified: true } },
    },
  })

  return products
    .map((product) => {
      const domain = getRootDomain(product.websiteUrl)
      if (!domain) return null
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        websiteUrl: product.websiteUrl!,
        domain,
        expectedTxt: resolveExpectedTxt(product, domain),
      }
    })
    .filter(Boolean) as ClaimableProductSummary[]
}

async function getClaimTarget(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      verification: true,
      organization: {
        select: { id: true, name: true },
      },
    },
  })
  if (!product) return { error: "Product not found." }
  if (!product.websiteUrl) {
    return { error: "Product is missing a website URL." }
  }
  if (product.verification?.isVerified) {
    return { error: "This product is already verified." }
  }
  const domain = getRootDomain(product.websiteUrl)
  if (!domain) return { error: "Unable to derive domain from website." }
  const expectedTxt =
    product.verification?.verificationTxt ??
    generateVerificationTxtFromWebsite(product.websiteUrl)
  return { product, domain, expectedTxt }
}

async function ensureNotOwner(
  product: Prisma.ProductGetPayload<{
    include: { organization: { select: { id: true } } }
  }>,
  viewerId: string,
) {
  if (product.userId === viewerId) {
    return { error: "You already own this product." }
  }
  if (product.organizationId) {
    const membership = await prisma.organizationMembership.findFirst({
      where: { userId: viewerId, organizationId: product.organizationId },
      select: { id: true },
    })
    if (membership) {
      return {
        error:
          "You already have access to this product through your organization.",
      }
    }
  }
  return {}
}

async function reserveClaimAttempt(opts: {
  productId: string
  userId: string
  method: "dns" | "email_otp"
  email?: string
  otpHash?: string | null
  expiresAt?: Date | null
}): Promise<{ attempt?: ProductClaimAttempt; error?: string }> {
  const now = new Date()
  return prisma.$transaction(async (tx) => {
    const active = await tx.productClaimAttempt.findFirst({
      where: {
        productId: opts.productId,
        status: "pending",
        otpExpiresAt: { gt: now },
      },
      orderBy: { updatedAt: "desc" },
    })

    if (active && active.userId !== opts.userId) {
      return {
        error:
          "Another claim attempt is already running for this product. Try again shortly.",
      }
    }

    if (active) {
      const updated = await tx.productClaimAttempt.update({
        where: { id: active.id },
        data: {
          method: opts.method,
          email: opts.email ?? active.email,
          otpHash: opts.otpHash ?? active.otpHash,
          otpExpiresAt: opts.expiresAt ?? active.otpExpiresAt,
          status: "pending",
        },
      })
      return { attempt: updated }
    }

    const created = await tx.productClaimAttempt.create({
      data: {
        productId: opts.productId,
        userId: opts.userId,
        method: opts.method,
        email: opts.email,
        otpHash: opts.otpHash ?? null,
        otpExpiresAt: opts.expiresAt,
        status: "pending",
      },
    })
    return { attempt: created }
  })
}

async function checkDnsTxtRecord(
  websiteUrl: string,
  expected: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const domain = getRootDomain(websiteUrl)
    if (!domain) return { success: false, error: "Invalid domain." }

    const resolver = new Resolver()
    resolver.setServers(["1.1.1.1", "8.8.8.8"])
    const txtRecords = await resolver.resolveTxt(domain)
    const flattened = txtRecords.flat().map((txt) => txt.trim())
    const matched = flattened.some((txt) => txt === expected.trim())

    return matched
      ? { success: true }
      : { success: false, error: "Verification TXT record not found in DNS." }
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "UNKNOWN"
    return { success: false, error: `DNS check failed: ${code}` }
  }
}

async function finalizeClaim(
  productId: string,
  claimantId: string,
  verificationTxt: string,
  tx?: Prisma.TransactionClient,
): Promise<
  | { error: string }
  | { success: true; slug: string; previousOwnerId: string | null }
> {
  const now = new Date()
  const client = tx ?? prisma

  const product = await client.product.findUnique({
    where: { id: productId },
    include: { verification: true },
  })
  if (!product) return { error: "Product not found." }
  if (product.verification?.isVerified) {
    return { error: "This product is already verified." }
  }

  await client.product.update({
    where: { id: product.id },
    data: { userId: claimantId },
  })

  await client.productVerification.upsert({
    where: { productId: product.id },
    create: {
      productId: product.id,
      verificationTxt,
      isVerified: true,
      verifiedAt: now,
    },
    update: {
      verificationTxt,
      isVerified: true,
      verifiedAt: now,
    },
  })

  await client.productClaimAttempt.updateMany({
    where: { productId: product.id, status: "pending" },
    data: { status: "fulfilled" as ProductClaimStatus, otpHash: null },
  })

  return {
    success: true,
    slug: product.slug,
    previousOwnerId: product.userId,
  }
}

function revalidateAfterClaim(
  slug: string | null | undefined,
  previousOwnerId: string | null | undefined,
  claimantId: string,
) {
  if (slug) {
    revalidateProduct(slug)
  }
  if (previousOwnerId) {
    revalidateUser(previousOwnerId)
  }
  revalidateUser(claimantId)
}

export async function getClaimableProducts(params?: {
  q?: string | string[]
}) {
  const { userId: clerkId } = await auth()
  if (!clerkId) throw new Error("Unauthenticated")
  const user = await getActiveUserByClerkId(clerkId)
  if (!user) throw new Error(INACTIVE_ACCOUNT_MESSAGE)

  const qParam = Array.isArray(params?.q) ? params?.q[0] : params?.q
  const q = qParam?.trim()

  const products = await getClaimableProductsForViewer(user.id, q)
  return { products }
}

export async function claimProductViaDnsAction(productId: string) {
  if (!productId) return { error: "Missing product identifier." }
  const { userId } = await auth()
  if (!userId) return { error: "Please sign in to continue." }
  const viewer = await getActiveUserByClerkId(userId)
  if (!viewer) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const target = await getClaimTarget(productId)
  if ("error" in target) return target

  const ownershipCheck = await ensureNotOwner(target.product, viewer.id)
  if ("error" in ownershipCheck) return ownershipCheck

  const lockResult = await reserveClaimAttempt({
    productId,
    userId: viewer.id,
    method: "dns",
    expiresAt: new Date(Date.now() + DNS_LOCK_WINDOW_MS),
  })
  if ("error" in lockResult) return lockResult

  const dnsResult = await checkDnsTxtRecord(
    target.product.websiteUrl,
    target.expectedTxt,
  )
  if (!dnsResult.success) {
    return { error: dnsResult.error ?? "DNS check failed." }
  }

  const claimResult = await prisma.$transaction(async (tx) => {
    const claim = await finalizeClaim(
      target.product.id,
      viewer.id,
      target.expectedTxt,
      tx,
    )
    return claim
  })

  if ("error" in claimResult) return claimResult

  revalidateAfterClaim(
    claimResult.slug,
    claimResult.previousOwnerId,
    viewer.id,
  )
  return { success: true, slug: claimResult.slug }
}

export async function sendProductClaimOtpAction(
  productId: string,
  email: string,
) {
  if (!productId) return { error: "Missing product identifier." }
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail.includes("@")) return { error: "Enter a valid email." }

  const { userId } = await auth()
  if (!userId) return { error: "Please sign in to continue." }
  const viewer = await getActiveUserByClerkId(userId)
  if (!viewer) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const target = await getClaimTarget(productId)
  if ("error" in target) return target

  if (!emailMatchesDomain(normalizedEmail, target.domain)) {
    return {
      error: `Email must use ${target.domain}.`,
    }
  }

  const ownershipCheck = await ensureNotOwner(target.product, viewer.id)
  if ("error" in ownershipCheck) return ownershipCheck

  const code = generateOtpCode()
  const hashed = hashOtp(code)
  const expiresAt = new Date(Date.now() + CLAIM_PENDING_WINDOW_MS)

  const reserve = await reserveClaimAttempt({
    productId,
    userId: viewer.id,
    method: "email_otp",
    email: normalizedEmail,
    otpHash: hashed,
    expiresAt,
  })
  if ("error" in reserve) return reserve

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: `Verify ${target.domain} ownership`,
      text: [
        `Use this code to claim ${target.product.name} on Shipyard: ${code}`,
        "",
        "This code expires in 15 minutes.",
        "If you did not request this, you can ignore the email.",
      ].join("\n"),
    })
  } catch (error) {
    console.error("Failed to send claim OTP email", { error })
    return { error: "Failed to send verification email. Try again." }
  }

  return { success: true, expiresAt: expiresAt.toISOString() }
}

export async function verifyProductClaimOtpAction(
  productId: string,
  code: string,
) {
  if (!productId) return { error: "Missing product identifier." }
  const trimmedCode = code.trim()
  if (!/^[0-9]{6}$/.test(trimmedCode)) {
    return { error: "Enter the 6-digit code from your email." }
  }

  const { userId } = await auth()
  if (!userId) return { error: "Please sign in to continue." }
  const viewer = await getActiveUserByClerkId(userId)
  if (!viewer) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const target = await getClaimTarget(productId)
  if ("error" in target) return target

  const ownershipCheck = await ensureNotOwner(target.product, viewer.id)
  if ("error" in ownershipCheck) return ownershipCheck

  const now = new Date()
  const hashed = hashOtp(trimmedCode)

  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.productClaimAttempt.findFirst({
      where: {
        productId,
        userId: viewer.id,
        method: "email_otp",
        status: "pending",
      },
      orderBy: { updatedAt: "desc" },
    })

    if (!attempt) {
      return { error: "No active email verification found. Send a new code." }
    }

    if (attempt.otpExpiresAt && attempt.otpExpiresAt < now) {
      await tx.productClaimAttempt.update({
        where: { id: attempt.id },
        data: { status: "expired" as ProductClaimStatus },
      })
      return { error: "That code has expired. Send a new code." }
    }

    if (attempt.otpHash !== hashed) {
      return { error: "Invalid code. Double-check and try again." }
    }

    const claim = await finalizeClaim(
      target.product.id,
      viewer.id,
      target.expectedTxt,
      tx,
    )
    if ("error" in claim) return claim

    await tx.productClaimAttempt.update({
      where: { id: attempt.id },
      data: { status: "fulfilled" as ProductClaimStatus, otpHash: null },
    })

    return { success: true, slug: claim.slug, previousOwnerId: claim.previousOwnerId }
  })

  if ("error" in result) return result

  revalidateAfterClaim(result.slug, result.previousOwnerId, viewer.id)
  return { success: true, slug: result.slug }
}
