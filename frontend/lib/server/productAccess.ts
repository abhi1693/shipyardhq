import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"

import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import { memberProductsStatusPath } from "@/lib/routes"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

export type ManageablePlanSummary = {
  id: string
  name: string
  type: string
  price: number
  isDefault: boolean
}

export type ManageableProductSummary = {
  id: string
  name: string
  slug: string
  userId: string
  currentPlan: ManageablePlanSummary | null
}

type ManageableProductPayload = {
  product: ManageableProductSummary
}

type ActiveUser = {
  id: string
}

type RequireOptions = {
  unauthorizedRedirect?: string | null
  missingRedirect?: string | null
}

function handleMissing(redirectPath: string | null | undefined) {
  if (redirectPath === null) {
    notFound()
  }
  if (redirectPath) {
    redirect(redirectPath)
  }
  notFound()
}

function handleUnauthorized(redirectPath: string | null | undefined) {
  if (redirectPath === null) {
    notFound()
  }
  redirect(redirectPath ?? memberProductsStatusPath("unauthorized"))
}

export async function requireManageableProduct(
  slug: string,
  options: RequireOptions = {},
): Promise<{ product: ManageableProductSummary; currentUser: ActiveUser }> {
  const { unauthorizedRedirect, missingRedirect } = options

  const authResult = await auth()
  const { userId: clerkId } = authResult
  if (!clerkId) {
    handleUnauthorized(unauthorizedRedirect)
  }

  const authToken = authResult.getToken
    ? await authResult.getToken().catch(() => null)
    : null
  if (!authToken) {
    handleUnauthorized(unauthorizedRedirect)
  }

  try {
    const response = await fastapiFetch<ApiResponse<ManageableProductPayload>>(
      `/api/v1/member/products/${encodeURIComponent(slug)}/manageable`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    )

    if (response.status !== 200 || !response.data?.product) {
      handleMissing(missingRedirect)
    }

    const product = response.data.product
    return {
      product,
      currentUser: { id: product.userId },
    }
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403) {
      handleUnauthorized(unauthorizedRedirect)
    }
    if (status === 404 || status === 422) {
      handleMissing(missingRedirect)
    }
    throw error
  }
}
