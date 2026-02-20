import { auth } from "@clerk/nextjs/server"

import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import type { PlanFeatureKey } from "@/lib/constants"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

type MemberFeatureAccessPayload = {
  featureKey: string
  hasAccess: boolean
}

async function getAuthToken() {
  const authResult = await auth()
  if (!authResult.userId || !authResult.getToken) {
    return null
  }
  return authResult.getToken().catch(() => null)
}

// Check if the current member has access to a feature via any paid plan
export async function memberHasFeature(key: PlanFeatureKey): Promise<boolean> {
  try {
    const authToken = await getAuthToken()
    if (!authToken) return false

    const response = await fastapiFetch<ApiResponse<MemberFeatureAccessPayload>>(
      `/api/v1/member/features/${encodeURIComponent(key)}/has-access`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    )

    if (response.status !== 200 || !response.data) {
      return false
    }

    return response.data.hasAccess === true
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403 || status === 404 || status === 422) {
      return false
    }
    return false
  }
}

export async function requireMemberFeature(
  key: PlanFeatureKey,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const ok = await memberHasFeature(key)
  if (!ok)
    return {
      ok: false,
      reason: `Missing required feature: ${key}`,
    }
  return { ok: true }
}
