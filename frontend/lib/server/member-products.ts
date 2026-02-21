import { auth } from "@clerk/nextjs/server"
import { dodoClient } from "@/lib/dodo"
import { createPlanCheckout } from "@/lib/server/dodoCheckout"
import {
  PaymentConnectorProvider,
  type PaymentConnectorStatus,
} from "@/lib/vendor/prisma/client"
import {
  validateConnectorApiKey,
  upsertPaymentConnector,
} from "@/lib/server/payments/connectors"
import { memberProductPath } from "@/lib/routes"
import type { PaymentConnectorConfig } from "@/lib/server/payments/types"
import { dispatchEventAsync } from "@/lib/server/events"
import { APP_EVENTS } from "@/lib/server/events/constants"
import { fetchDodoCustomerByEmail } from "@/lib/fetchDodoCustomer"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import { getPublicPlansServer } from "@/lib/server/generated-member"

import { headers } from "next/headers"

type ListParams = Record<string, string | string[] | undefined>

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

type MemberMe = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  status: string
}

type OwnedPlan = {
  id: string
  name: string
  type: string
  price: number
  isDefault: boolean
}

type OwnedProduct = {
  id: string
  name: string
  slug: string
  userId: string
  status: string
  planAssignedAt: string | null
  currentPlan: OwnedPlan | null
}

type OwnedProductPayload = {
  product: OwnedProduct
}

type MemberProductsPayload = {
  products: Array<Record<string, unknown>>
  total: number
  page: number
  limit: number
}

const INACTIVE_ACCOUNT_MESSAGE = "Account is not active"
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active"])
const SUBSCRIPTION_CHANGE_PRORATION_MODE = "prorated_immediately"

const appendQueryParam = (path: string, key: string, value: string) => {
  const separator = path.includes("?") ? "&" : "?"
  return `${path}${separator}${key}=${encodeURIComponent(value)}`
}

const buildUpgradeRedirect = (path: string) => appendQueryParam(path, "upgraded", "1")

const buildErrorRedirect = (path: string, errorCode: string) =>
  appendQueryParam(path, "error", errorCode)

const mapOwnershipErrorCode = (error: string) => {
  if (error === "Unauthenticated") return "unauthenticated"
  if (error === INACTIVE_ACCOUNT_MESSAGE) return "inactive_account"
  if (error === "Product not found or not owned by user") return "product_not_found"
  return "ownership_check_failed"
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
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

async function getAuthToken() {
  const authResult = await auth()
  if (!authResult.userId || !authResult.getToken) {
    return null
  }
  return authResult.getToken().catch(() => null)
}

async function getMemberMeByToken(authToken: string): Promise<MemberMe | null> {
  try {
    const response = await fastapiFetch<ApiResponse<MemberMe>>("/api/v1/member/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
    if (response.status !== 200 || !response.data) {
      return null
    }
    return response.data
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403 || status === 404 || status === 422) {
      return null
    }
    throw error
  }
}

async function fetchOwnedProductById(
  productId: string,
  authToken: string,
): Promise<ApiResponse<OwnedProductPayload>> {
  const encodedProductId = encodeURIComponent(productId)
  return fastapiFetch<ApiResponse<OwnedProductPayload>>(
    `/api/v1/member/products/${encodedProductId}/ownership`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  )
}

async function requireOwnedProduct(productId: string): Promise<
  | {
      member: MemberMe
      product: OwnedProduct
      authToken: string
    }
  | { error: string }
> {
  const authToken = await getAuthToken()
  if (!authToken) {
    return { error: "Unauthenticated" }
  }

  const member = await getMemberMeByToken(authToken)
  if (!member) {
    return { error: INACTIVE_ACCOUNT_MESSAGE }
  }

  try {
    const response = await fetchOwnedProductById(productId, authToken)
    if (response.status !== 200 || !response.data?.product) {
      return { error: "Product not found or not owned by user" }
    }
    return {
      member,
      product: response.data.product,
      authToken,
    }
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403) {
      return { error: INACTIVE_ACCOUNT_MESSAGE }
    }
    if (status === 404 || status === 422) {
      return { error: "Product not found or not owned by user" }
    }
    const detail = getFastApiErrorDetail(error)
    if (detail) {
      return { error: detail }
    }
    throw error
  }
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function buildMemberProductsQuery(params?: ListParams) {
  const search = new URLSearchParams()

  const verification = getSingleParam(params?.verification)
  const status = getSingleParam(params?.status)
  const q = getSingleParam(params?.q)
  const sort = getSingleParam(params?.sort)
  const page = getSingleParam(params?.page)
  const limit = getSingleParam(params?.limit)

  if (verification) search.set("verification", verification)
  if (status) search.set("status", status)
  if (q) search.set("q", q)
  if (sort) search.set("sort", sort)
  if (page) search.set("page", page)
  if (limit) search.set("limit", limit)

  const query = search.toString()
  return query ? `/api/v1/member/products?${query}` : "/api/v1/member/products"
}

async function findActiveSubscriptionForProduct(args: {
  email: string
  productId: string
}) {
  const customer = await fetchDodoCustomerByEmail(args.email)
  if (!customer) return null

  let best: any | null = null
  let bestCreatedAt = 0

  for await (const subscription of dodoClient.subscriptions.list({
    customer_id: customer.customer_id,
    page_size: 100,
  } as any)) {
    const status = (subscription?.status || "").toString().toLowerCase()
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(status)) continue

    const metadata =
      typeof subscription?.metadata === "object" && subscription.metadata
        ? (subscription.metadata as Record<string, unknown>)
        : null
    const metaProductId =
      (metadata?.productId as string | undefined) ||
      (metadata?.product_id as string | undefined)
    if (metaProductId !== args.productId) continue

    const createdAt = parseIsoDate(subscription?.created_at)?.getTime() ?? 0
    if (!best || createdAt > bestCreatedAt) {
      best = subscription
      bestCreatedAt = createdAt
    }
  }

  return best
}

async function buildReturnUrl(productSlug: string): Promise<string | undefined> {
  try {
    const hdrs = await headers()
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host")
    const proto = (hdrs.get("x-forwarded-proto") || "https").split(",")[0]
    if (host) {
      return `${proto}://${host}${memberProductPath(productSlug)}`
    }
  } catch {
    // noop
  }
  return undefined
}

export async function getUserProducts(params?: ListParams) {
  const authToken = await getAuthToken()
  if (!authToken) throw new Error("Unauthenticated")

  try {
    const response = await fastapiFetch<ApiResponse<MemberProductsPayload>>(
      buildMemberProductsQuery(params),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    )

    if (response.status !== 200 || !response.data) {
      return { products: [], total: 0, page: 1, limit: 10 }
    }

    return {
      products: response.data.products,
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
    }
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403) {
      throw new Error(INACTIVE_ACCOUNT_MESSAGE)
    }
    if (status === 404 || status === 422) {
      return { products: [], total: 0, page: 1, limit: 10 }
    }
    throw error
  }
}

export async function setProductPlanAction(
  productId: string,
  planId: string | null,
  subscriptionId?: string | null,
) {
  const authToken = await getAuthToken()
  if (!authToken) return { error: "Unauthenticated" }

  const body: Record<string, string | null> = {
    planId,
  }
  if (subscriptionId !== undefined) {
    body.subscriptionId = subscriptionId
  }

  try {
    const response = await fastapiFetch<ApiResponse<{ success: boolean }>>(
      `/api/v1/member/products/${encodeURIComponent(productId)}/plan`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    )

    if (response.status !== 200 || !response.data?.success) {
      return { error: "Unable to update product plan" }
    }

    return { success: true }
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403) return { error: INACTIVE_ACCOUNT_MESSAGE }
    if (status === 404 || status === 422) {
      return { error: "Product not found or not owned by user" }
    }
    const detail = getFastApiErrorDetail(error)
    if (detail) {
      return { error: detail }
    }
    return { error: "Unable to update product plan" }
  }
}

export async function startPlanCheckoutAction(
  productId: string,
  planId: string,
) {
  const ownership = await requireOwnedProduct(productId)
  if ("error" in ownership) {
    return { error: ownership.error }
  }

  const plans = await getPublicPlansServer()
  const plan = plans.find((item) => item.id === planId)
  if (!plan) return { error: "Plan not found" }
  if (!plan.externalId || plan.price === 0) {
    return { error: "Checkout not required for this plan" }
  }

  const returnUrl = await buildReturnUrl(ownership.product.slug)

  try {
    const checkout = await createPlanCheckout({
      plan: { externalId: plan.externalId, type: plan.type },
      customer: {
        email: ownership.member.email ?? "",
        name: `${ownership.member.firstName ?? ""} ${
          ownership.member.lastName ?? ""
        }`.trim(),
      },
      metadata: { productId, planId },
      returnUrl,
    })
    return { redirectUrl: checkout.url }
  } catch (error) {
    console.error("Failed to start checkout:", error)
    return { error: "Checkout initialization failed" }
  }
}

export async function validatePaymentAndAttachPlan(paymentId: string) {
  const authToken = await getAuthToken()
  if (!authToken) return { error: "Unauthenticated" }

  try {
    const payment = await dodoClient.payments.retrieve(paymentId)
    if (!payment) return { error: "Payment not found" }

    if (payment.status !== "succeeded") {
      return { error: `Payment not succeeded: ${payment.status}` }
    }

    const meta = (payment.metadata || {}) as any
    const productId = meta.productId as string | undefined
    const planId = meta.planId as string | undefined
    if (!productId || !planId) {
      return { error: "Missing metadata for product/plan" }
    }

    const result = await setProductPlanAction(productId, planId, null)
    if ("error" in result) return result

    return { success: true }
  } catch (error) {
    console.error("Payment validation failed:", error)
    return { error: "Payment validation failed" }
  }
}

export async function validateSubscriptionAndAttachPlan(
  subscriptionId: string,
) {
  const authToken = await getAuthToken()
  if (!authToken) return { error: "Unauthenticated" }

  try {
    const subscription = await dodoClient.subscriptions.retrieve(subscriptionId)
    if (!subscription) return { error: "Subscription not found" }

    const status = (subscription.status || "").toString().toLowerCase()
    if (status !== "active") {
      return { error: `Subscription not active: ${subscription.status}` }
    }

    const meta = (subscription.metadata || {}) as any
    const productId = (meta.productId || meta.product_id) as string | undefined
    const planId = (meta.planId || meta.plan_id) as string | undefined
    if (!productId || !planId) {
      return { error: "Missing metadata for product/plan" }
    }

    const rawSubscriptionId =
      (subscription as any)?.subscription_id ||
      (subscription as any)?.id ||
      subscriptionId
    const subscriptionExternalId =
      typeof rawSubscriptionId === "string" ? rawSubscriptionId : subscriptionId

    const result = await setProductPlanAction(
      productId,
      planId,
      subscriptionExternalId,
    )
    if ("error" in result) return result

    return { success: true }
  } catch (error) {
    console.error("Subscription validation failed:", error)
    return { error: "Subscription validation failed" }
  }
}

export async function resolveChoosePlanRedirect(ctx: {
  productId: string
  redirectPath: string
  planId: string
}) {
  const planId = ctx.planId.trim()
  if (!planId) {
    return { redirectUrl: buildErrorRedirect(ctx.redirectPath, "plan_required") }
  }

  const plans = await getPublicPlansServer()
  const plan = plans.find((item) => item.id === planId)
  if (!plan) {
    return { redirectUrl: buildErrorRedirect(ctx.redirectPath, "plan_not_found") }
  }

  const ownership = await requireOwnedProduct(ctx.productId)
  if ("error" in ownership) {
    return {
      redirectUrl: buildErrorRedirect(
        ctx.redirectPath,
        mapOwnershipErrorCode(ownership.error),
      ),
    }
  }

  const activePlan = ownership.product.currentPlan
  const hasPaidPlan =
    !!activePlan && !activePlan.isDefault && (activePlan.price ?? 0) > 0
  if (hasPaidPlan && activePlan.type !== plan.type) {
    return { redirectUrl: buildErrorRedirect(ctx.redirectPath, "plan_type_locked") }
  }

  if ((plan.price || 0) > 0 && ownership.product.status !== "published") {
    return { redirectUrl: buildErrorRedirect(ctx.redirectPath, "must_publish") }
  }

  if ((plan.price || 0) === 0) {
    const result = await setProductPlanAction(ctx.productId, planId, null)
    if ("error" in result) {
      return {
        redirectUrl: buildErrorRedirect(ctx.redirectPath, "plan_update_failed"),
      }
    }
    return { redirectUrl: buildUpgradeRedirect(ctx.redirectPath) }
  }

  if ((plan.price || 0) > 0 && !plan.externalId) {
    return {
      redirectUrl: buildErrorRedirect(ctx.redirectPath, "plan_not_configured"),
    }
  }

  if (
    (plan.price || 0) > 0 &&
    plan.type === "recurring_price" &&
    ownership.member.email
  ) {
    const existingSubscription = await findActiveSubscriptionForProduct({
      email: ownership.member.email,
      productId: ctx.productId,
    })
    const rawSubscriptionId =
      (existingSubscription as any)?.subscription_id ||
      (existingSubscription as any)?.id ||
      null
    const normalizedSubscriptionId =
      typeof rawSubscriptionId === "string" ? rawSubscriptionId : null

    if (normalizedSubscriptionId) {
      try {
        const isSamePlan =
          (existingSubscription as any)?.product_id === plan.externalId
        if (!isSamePlan) {
          await dodoClient.subscriptions.changePlan(normalizedSubscriptionId, {
            product_id: plan.externalId,
            proration_billing_mode: SUBSCRIPTION_CHANGE_PRORATION_MODE,
            quantity: 1,
          } as any)
        }
        const result = await setProductPlanAction(
          ctx.productId,
          planId,
          normalizedSubscriptionId,
        )
        if ("error" in result) {
          return {
            redirectUrl: buildErrorRedirect(
              ctx.redirectPath,
              "plan_update_failed",
            ),
          }
        }
      } catch (error) {
        const status = (error as any)?.status
        const message = String((error as any)?.error?.message || "")
          .trim()
          .toLowerCase()
        if (status === 409 && message.includes("previous payment")) {
          console.warn("Subscription change blocked by pending payment")
          return {
            redirectUrl: buildErrorRedirect(
              ctx.redirectPath,
              "subscription_payment_pending",
            ),
          }
        }
        console.error("Failed to change subscription plan:", error)
        return {
          redirectUrl: buildErrorRedirect(
            ctx.redirectPath,
            "subscription_change_failed",
          ),
        }
      }
      return { redirectUrl: buildUpgradeRedirect(ctx.redirectPath) }
    }
  }

  const checkout = await startPlanCheckoutAction(ctx.productId, planId)
  const redirectUrl = (checkout as any)?.redirectUrl
  if (typeof redirectUrl === "string" && redirectUrl.trim()) {
    return { redirectUrl }
  }

  return {
    redirectUrl: buildErrorRedirect(ctx.redirectPath, "checkout_init_failed"),
  }
}

export async function getProductConnectorSummary(productId: string) {
  const authToken = await getAuthToken()
  if (!authToken) return null

  try {
    const response = await fastapiFetch<
      ApiResponse<{
        id: string
        provider: PaymentConnectorProvider
        status: PaymentConnectorStatus | null
        lastSyncedAt: string | null
        lastSyncError: string | null
        latestAllTimeRevenueCents: number | null
        latestCurrencyCode: string | null
        latestPeriodStart: string | null
        config: PaymentConnectorConfig | null
        keyHint: string | null
        accountId: string | null
        brandId: string | null
      } | null>
    >(`/api/v1/member/products/${encodeURIComponent(productId)}/connector`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    if (response.status !== 200) return null
    return response.data
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403 || status === 404 || status === 422) {
      return null
    }
    throw error
  }
}

export async function saveProductConnectorAction(input: {
  productId: string
  provider: PaymentConnectorProvider | string
  apiKey: string
  accountId?: string
  brandId?: string
}) {
  const guard = await requireOwnedProduct(input.productId)
  if ("error" in guard) return guard

  const provider =
    typeof input.provider === "string"
      ? (input.provider as PaymentConnectorProvider)
      : input.provider
  if (!Object.values(PaymentConnectorProvider).includes(provider)) {
    return { error: "Unsupported payment provider" }
  }
  const apiKey = input.apiKey?.trim()
  if (!apiKey) return { error: "API key is required" }
  const accountId = input.accountId?.trim()
  const brandId = input.brandId?.trim()
  if (provider === PaymentConnectorProvider.polar && !accountId) {
    return { error: "Polar organization ID is required" }
  }
  if (provider === PaymentConnectorProvider.revenuecat && !accountId) {
    return { error: "RevenueCat project ID is required" }
  }
  if (provider === PaymentConnectorProvider.lemonsqueezy && !accountId) {
    return { error: "Lemon Squeezy store ID is required" }
  }
  if (
    provider === PaymentConnectorProvider.paystack &&
    accountId &&
    !accountId.toUpperCase().startsWith("ACCT_")
  ) {
    return { error: "Paystack subaccount codes must start with ACCT_" }
  }
  if (brandId && !brandId.startsWith("brnd_") && !brandId.startsWith("bus_")) {
    return { error: "Dodo brand IDs must start with brnd_ or bus_" }
  }
  if (brandId && provider !== PaymentConnectorProvider.dodo) {
    return { error: "Brand ID is only supported for Dodo" }
  }
  if (provider === PaymentConnectorProvider.dodo && !brandId) {
    return { error: "Brand ID is required for Dodo" }
  }

  try {
    await validateConnectorApiKey({
      productId: input.productId,
      provider,
      apiKey,
      config:
        accountId || brandId
          ? {
              ...(accountId ? { accountId } : {}),
              ...(brandId ? { brandId } : {}),
            }
          : undefined,
    })
    const result = await upsertPaymentConnector({
      productId: input.productId,
      provider,
      apiKey,
      config:
        accountId || brandId
          ? {
              ...(accountId ? { accountId } : {}),
              ...(brandId ? { brandId } : {}),
            }
          : undefined,
    })
    dispatchEventAsync(
      APP_EVENTS.PAYMENTS_CONNECTOR_SYNC,
      { connectorId: result.connector.id },
      {
        context: {
          productId: input.productId,
          connectorId: result.connector.id,
        },
      },
    )
    const summary = await getProductConnectorSummary(input.productId)
    return { ok: true, connectorId: result.connector.id, connector: summary }
  } catch (error: any) {
    return { error: error?.message || "Failed to save connector" }
  }
}
