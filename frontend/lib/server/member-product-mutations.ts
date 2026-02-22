import { auth } from "@clerk/nextjs/server"

import { getOwnedProductContextApiV1MemberProductsProductIdOwnershipGet } from "@/lib/generated/fastapi/member"
import {
  productDetailViewDestroyApiV1ProductIdDelete,
  productDetailViewPartialUpdateApiV1ProductIdPatch,
} from "@/lib/generated/fastapi/product"
import type { ProductStatus } from "@/lib/generated/fastapi/schemas"
import type { FastApiError } from "@/lib/fastapi-fetcher"
import { getPublicPlansServer } from "@/lib/server/generated-member"

const INACTIVE_ACCOUNT_MESSAGE = "Account is not active"
const VALID_STATUSES = new Set<ProductStatus>(["draft", "published", "archived"])

type MutationError = {
  error: string
  status: number
}

type MutationSuccess = {
  success: true
  id: string
  status: ProductStatus
  slug: string
}

type OwnedProductContext = {
  numericProductId: number
  currentPlanId: string | null
  currentPlanIsDefault: boolean
  currentPlanPrice: number
  planAssignedAt: Date | null
}

const getFastApiErrorDetail = (error: unknown): string | null => {
  const info = (error as FastApiError | undefined)?.info as
    | { detail?: unknown }
    | undefined
  if (typeof info?.detail === "string") {
    return info.detail
  }
  return null
}

const toNumericProductId = (value: string): number | null => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

const parseIsoDate = (value: string | null | undefined): Date | null => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

const mapBackendError = (
  error: unknown,
  fallback: string,
  fallbackStatus = 500,
): MutationError => {
  const status = (error as FastApiError | undefined)?.status ?? fallbackStatus
  const detail = getFastApiErrorDetail(error)

  if (status === 401) {
    return { error: "Unauthenticated", status: 401 }
  }
  if (status === 403) {
    return { error: detail || INACTIVE_ACCOUNT_MESSAGE, status: 403 }
  }
  if (status === 404) {
    return { error: detail || "Product not found or not owned by user", status: 404 }
  }
  if (status === 422) {
    return { error: detail || "Invalid request payload", status: 400 }
  }
  return { error: detail || fallback, status }
}

const getServerAuthToken = async () => {
  const authResult = await auth()
  if (!authResult.userId || !authResult.getToken) {
    return null
  }
  return authResult.getToken().catch(() => null)
}

const getOwnedProductContext = async (
  productId: string,
  authToken: string,
): Promise<OwnedProductContext | MutationError> => {
  try {
    const response = await getOwnedProductContextApiV1MemberProductsProductIdOwnershipGet(
      productId,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    )

    if (response.status !== 200 || !response.data?.product) {
      return { error: "Product not found or not owned by user", status: 404 }
    }

    const numericProductId = toNumericProductId(response.data.product.id)
    if (numericProductId == null) {
      return { error: "Invalid product identifier", status: 422 }
    }

    const currentPlan = response.data.product.currentPlan

    return {
      numericProductId,
      currentPlanId: currentPlan?.id ?? null,
      currentPlanIsDefault: Boolean(currentPlan?.isDefault),
      currentPlanPrice: Number(currentPlan?.price ?? 0),
      planAssignedAt: parseIsoDate(response.data.product.planAssignedAt),
    }
  } catch (error) {
    return mapBackendError(
      error,
      "Unable to verify product ownership",
      500,
    )
  }
}

const isStatusLockedWhileBoosted = async (
  context: OwnedProductContext,
): Promise<boolean> => {
  const isFreePlan = context.currentPlanIsDefault || context.currentPlanPrice <= 0
  if (isFreePlan) return false

  if (!context.currentPlanId) {
    return true
  }

  const plans = await getPublicPlansServer().catch(() => [])
  const currentPlan = plans.find((plan) => plan.id === context.currentPlanId)
  if (!currentPlan) {
    return true
  }

  const boostForDays = Number(currentPlan.boostForDays ?? 0)
  if (!context.planAssignedAt || boostForDays <= 0) {
    return true
  }

  const expiresAt =
    context.planAssignedAt.getTime() + boostForDays * 24 * 60 * 60 * 1000
  return expiresAt > Date.now()
}

export async function updateOwnedProductStatus(args: {
  productId: string
  status: ProductStatus
}): Promise<MutationSuccess | MutationError> {
  if (!VALID_STATUSES.has(args.status)) {
    return { error: "Invalid request payload", status: 400 }
  }

  const authToken = await getServerAuthToken()
  if (!authToken) {
    return { error: "Unauthenticated", status: 401 }
  }

  const context = await getOwnedProductContext(args.productId, authToken)
  if ("error" in context) {
    return context
  }

  if (await isStatusLockedWhileBoosted(context)) {
    return { error: "Status locked while boosted.", status: 400 }
  }

  try {
    const response = await productDetailViewPartialUpdateApiV1ProductIdPatch(
      context.numericProductId,
      {
        status: args.status,
        published_at: args.status === "published" ? new Date().toISOString() : null,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    )

    if (response.status !== 200 || !response.data) {
      return { error: "Failed to update status", status: 500 }
    }

    return {
      success: true,
      id: String(response.data.id),
      status: response.data.status ?? args.status,
      slug: response.data.slug,
    }
  } catch (error) {
    return mapBackendError(error, "Failed to update status", 500)
  }
}

export async function deleteOwnedProduct(args: {
  productId: string
}): Promise<{ success: true } | MutationError> {
  const authToken = await getServerAuthToken()
  if (!authToken) {
    return { error: "Unauthenticated", status: 401 }
  }

  const context = await getOwnedProductContext(args.productId, authToken)
  if ("error" in context) {
    return context
  }

  try {
    const response = await productDetailViewDestroyApiV1ProductIdDelete(
      context.numericProductId,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    )

    if (response.status !== 204) {
      return { error: "Failed to delete product", status: 500 }
    }

    return { success: true }
  } catch (error) {
    return mapBackendError(error, "Failed to delete product", 500)
  }
}
