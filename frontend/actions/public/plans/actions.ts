"use server"

import { cached, DEFAULT_TTL, TAGS } from "@/lib/cache"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"
import type { PlanType } from "@/lib/generated/fastapi/schemas"

export type PublicPlanFeature = {
  id: string
  name: string
  key: string
  description: string
  enabled: boolean
  isExperimental: boolean
}

export type PublicPlan = {
  id: string
  name: string
  slug: string
  description?: string | null
  type: PlanType
  price: number
  discount?: number | null
  boostForDays: number
  isDefault: boolean
  externalId?: string | null
  paymentFrequencyCount?: number | null
  paymentFrequencyInterval?: string | null
  subscriptionPeriodCount?: number | null
  subscriptionPeriodInterval?: string | null
  priceSuffix?: string
  productCount: number
  features: PublicPlanFeature[]
}

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

const isFastApiNotFound = (error: unknown) => {
  const status = (error as FastApiError | undefined)?.status
  return status === 404 || status === 422
}

const buildPublicPlansUrl = (type?: PlanType) => {
  if (!type) return "/api/v1/public/plans"
  const search = new URLSearchParams({ type: String(type) })
  return `/api/v1/public/plans?${search.toString()}`
}

const computePriceSuffix = (plan: PublicPlan): string | undefined => {
  if (plan.type !== "recurring_price" || !plan.paymentFrequencyInterval) {
    return undefined
  }
  const count = plan.paymentFrequencyCount ?? 1
  const interval = String(plan.paymentFrequencyInterval)
  const human = count === 1 ? interval : `${count} ${interval}s`
  return `per ${human}`
}

const fetchPublicPlans = async (type?: PlanType): Promise<PublicPlan[]> => {
  try {
    const response = await fastapiFetch<ApiResponse<PublicPlan[]>>(
      buildPublicPlansUrl(type),
      { method: "GET" },
    )
    if (response.status !== 200 || !Array.isArray(response.data)) {
      return []
    }
    return response.data.map((plan) => ({
      ...plan,
      priceSuffix: computePriceSuffix(plan),
    }))
  } catch (error) {
    if (isFastApiNotFound(error)) {
      return []
    }
    throw error
  }
}

const getPublicPlansCached = cached(fetchPublicPlans, "public:plans", {
  ttl: DEFAULT_TTL.slow,
  tags: () => [TAGS.plans],
  keyParts: ([type]) => (type ? [`type:${type}`] : ["type:all"]),
})

export async function getPublicPlans(opts?: { type?: PlanType }) {
  return getPublicPlansCached(opts?.type)
}
