"use server"

import { createHash, randomInt } from "crypto"
import { Resolver } from "dns/promises"
import { auth } from "@clerk/nextjs/server"

import { revalidateProduct, revalidateUser } from "@/lib/cache/revalidate"
import {
  getActiveUserByClerkId,
  INACTIVE_ACCOUNT_MESSAGE,
} from "@/lib/server/userStatus"
import { sendClaimOtpNotification } from "@/lib/server/notifications/novuClaim"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

type ClaimableProductSummary = {
  id: string
  name: string
  slug: string
  websiteUrl: string
  domain: string
  expectedTxt: string
}

type ClaimTarget = {
  id: string
  name: string
  slug: string
  websiteUrl: string
  domain: string
  expectedTxt: string
}

const CLAIM_PENDING_WINDOW_MS = 15 * 60 * 1000

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

async function getAuthToken() {
  const authResult = await auth()
  if (!authResult.userId || !authResult.getToken) return null
  return authResult.getToken().catch(() => null)
}

function getFastApiErrorDetail(error: unknown): string | null {
  const info = (error as FastApiError | undefined)?.info as
    | { detail?: unknown }
    | undefined
  if (typeof info?.detail === "string") {
    return info.detail
  }
  return null
}

async function getClaimTarget(
  authToken: string,
  productId: string,
): Promise<ClaimTarget> {
  const response = await fastapiFetch<ApiResponse<ClaimTarget>>(
    `/api/v1/member/claims/${encodeURIComponent(productId)}/target`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  )
  if (response.status !== 200 || !response.data) {
    throw new Error("Product not found.")
  }
  return response.data
}

async function confirmClaimDns(authToken: string, productId: string) {
  const response = await fastapiFetch<
    ApiResponse<{ success: boolean; lockExpiresAt: string | null }>
  >(`/api/v1/member/claims/${encodeURIComponent(productId)}/dns/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })

  if (response.status !== 200 || !response.data?.success) {
    throw new Error("Unable to start claim verification.")
  }

  return response.data
}

async function requestClaimOtp(
  authToken: string,
  productId: string,
  payload: {
    email: string
    otpHash: string
    otpExpiresAt: string
  },
) {
  const response = await fastapiFetch<
    ApiResponse<{
      success: boolean
      expiresAt: string | null
      domain: string
      productName: string
    }>
  >(`/api/v1/member/claims/${encodeURIComponent(productId)}/otp/request`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (response.status !== 200 || !response.data?.success) {
    throw new Error("Unable to send verification code.")
  }

  return response.data
}

async function verifyClaimOtp(
  authToken: string,
  productId: string,
  otpHash: string,
) {
  const response = await fastapiFetch<
    ApiResponse<{
      success: boolean
      slug: string
      previousOwnerId: string | null
    }>
  >(`/api/v1/member/claims/${encodeURIComponent(productId)}/otp/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ otpHash }),
  })

  if (response.status !== 200 || !response.data?.success) {
    throw new Error("Unable to verify claim code.")
  }

  return response.data
}

async function checkDnsTxtRecord(
  websiteUrl: string,
  expected: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const host = new URL(websiteUrl).hostname
    if (!host) return { success: false, error: "Invalid domain." }

    const resolver = new Resolver()
    resolver.setServers(["1.1.1.1", "8.8.8.8"])
    const txtRecords = await resolver.resolveTxt(host)
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

export async function getClaimableProducts(params?: { q?: string | string[] }) {
  const authToken = await getAuthToken()
  if (!authToken) throw new Error("Unauthenticated")

  const qParam = Array.isArray(params?.q) ? params?.q[0] : params?.q
  const q = qParam?.trim()
  const query = q ? `?q=${encodeURIComponent(q)}` : ""

  try {
    const response = await fastapiFetch<
      ApiResponse<{ products: ClaimableProductSummary[] }>
    >(`/api/v1/member/claims/products${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    if (response.status !== 200 || !response.data) {
      return { products: [] as ClaimableProductSummary[] }
    }

    return { products: response.data.products || [] }
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403) {
      throw new Error(INACTIVE_ACCOUNT_MESSAGE)
    }
    if (status === 404 || status === 422) {
      return { products: [] as ClaimableProductSummary[] }
    }
    throw error
  }
}

export async function claimProductViaDnsAction(productId: string) {
  if (!productId) return { error: "Missing product identifier." }

  const { userId } = await auth()
  if (!userId) return { error: "Please sign in to continue." }
  const viewer = await getActiveUserByClerkId(userId)
  if (!viewer) return { error: INACTIVE_ACCOUNT_MESSAGE }

  const authToken = await getAuthToken()
  if (!authToken) return { error: "Please sign in to continue." }

  try {
    const target = await getClaimTarget(authToken, productId)

    const dnsResult = await checkDnsTxtRecord(target.websiteUrl, target.expectedTxt)
    if (!dnsResult.success) {
      return { error: dnsResult.error ?? "DNS check failed." }
    }

    const result = await confirmClaimDns(authToken, productId)
    return { success: true, lockExpiresAt: result.lockExpiresAt }
  } catch (error) {
    const detail = getFastApiErrorDetail(error)
    if (detail) return { error: detail }

    const status = (error as FastApiError | undefined)?.status
    if (status === 403) {
      return { error: INACTIVE_ACCOUNT_MESSAGE }
    }

    console.error("Failed to confirm DNS product claim", { error, productId })
    return { error: "Unable to verify DNS claim right now." }
  }
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

  const authToken = await getAuthToken()
  if (!authToken) return { error: "Please sign in to continue." }

  try {
    const target = await getClaimTarget(authToken, productId)

    if (!emailMatchesDomain(normalizedEmail, target.domain)) {
      return {
        error: `Email must use ${target.domain}.`,
      }
    }

    const code = generateOtpCode()
    const hashed = hashOtp(code)
    const expiresAt = new Date(Date.now() + CLAIM_PENDING_WINDOW_MS)

    await requestClaimOtp(authToken, productId, {
      email: normalizedEmail,
      otpHash: hashed,
      otpExpiresAt: expiresAt.toISOString(),
    })

    try {
      await sendClaimOtpNotification({
        recipient: {
          subscriberId: userId,
          email: normalizedEmail,
          firstName: viewer.firstName,
          lastName: viewer.lastName,
        },
        payload: {
          code,
          productName: target.name,
          domain: target.domain,
          expiresAt: expiresAt.toISOString(),
          method: "email_otp",
        },
        transactionId: `product_claim_otp:${productId}:${viewer.id}:${Date.now()}`,
      })
    } catch (error) {
      console.error("Failed to send claim OTP email", { error })
      return { error: "Failed to send verification email. Try again." }
    }

    return { success: true, expiresAt: expiresAt.toISOString() }
  } catch (error) {
    const detail = getFastApiErrorDetail(error)
    if (detail) return { error: detail }

    const status = (error as FastApiError | undefined)?.status
    if (status === 403) {
      return { error: INACTIVE_ACCOUNT_MESSAGE }
    }

    console.error("Failed to request product claim OTP", { error, productId })
    return { error: "Unable to send verification email right now." }
  }
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

  const authToken = await getAuthToken()
  if (!authToken) return { error: "Please sign in to continue." }

  try {
    const result = await verifyClaimOtp(authToken, productId, hashOtp(trimmedCode))
    revalidateAfterClaim(result.slug, result.previousOwnerId, viewer.id)
    return { success: true, slug: result.slug }
  } catch (error) {
    const detail = getFastApiErrorDetail(error)
    if (detail) return { error: detail }

    const status = (error as FastApiError | undefined)?.status
    if (status === 403) {
      return { error: INACTIVE_ACCOUNT_MESSAGE }
    }

    console.error("Failed to verify product claim OTP", { error, productId })
    return { error: "Unable to verify claim code." }
  }
}
