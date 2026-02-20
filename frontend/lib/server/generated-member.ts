import type { User as ClerkUser } from "@clerk/backend"
import { auth } from "@clerk/nextjs/server"

import { listApiV1AlternativeProductGet } from "@/lib/generated/fastapi/alternative-product"
import { listApiV1CategoryGet } from "@/lib/generated/fastapi/category"
import {
  getMemberMeApiV1MemberMeGet,
  getMemberProductConnectorApiV1MemberProductsProductIdConnectorGet,
  syncMemberMeApiV1MemberMeSyncPost,
} from "@/lib/generated/fastapi/member"
import { getPublicPlansApiV1PublicPlansGet } from "@/lib/generated/fastapi/public-homepage"
import type {
  GetMemberProductConnectorApiV1MemberProductsProductIdConnectorGet200,
  PublicPlan,
} from "@/lib/generated/fastapi/schemas"
import type { PlanType } from "@/lib/generated/fastapi/schemas"

const getServerAuthToken = async () => {
  const authResult = await auth()
  if (!authResult.userId || !authResult.getToken) return null
  return authResult.getToken().catch(() => null)
}

const computePriceSuffix = (plan: PublicPlan): string | undefined => {
  if (plan.type !== "recurring_price" || !plan.paymentFrequencyInterval) {
    return undefined
  }
  const count = plan.paymentFrequencyCount ?? 1
  const interval = String(plan.paymentFrequencyInterval)
  return `per ${count === 1 ? interval : `${count} ${interval}s`}`
}

export async function syncMemberFromClerkUser(clerkUser: ClerkUser) {
  const token = await getServerAuthToken()
  if (!token) {
    throw new Error("Unauthenticated")
  }

  const response = await syncMemberMeApiV1MemberMeSyncPost(
    {
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      firstName: clerkUser.firstName ?? null,
      lastName: clerkUser.lastName ?? null,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
  if (response.status !== 200) {
    throw new Error("Unable to sync user profile.")
  }
  return response.data
}

export async function getMemberMeServer() {
  const token = await getServerAuthToken()
  if (!token) return null

  const response = await getMemberMeApiV1MemberMeGet({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (response.status !== 200) return null
  return response.data
}

export async function getPublicPlansServer(opts?: { type?: PlanType }) {
  const response = await getPublicPlansApiV1PublicPlansGet(
    opts?.type ? { type: opts.type } : undefined,
  )
  if (response.status !== 200 || !Array.isArray(response.data)) return []
  return response.data.map((plan) => ({
    ...plan,
    priceSuffix: computePriceSuffix(plan),
  }))
}

export async function getCategoryOptionsServer() {
  const response = await listApiV1CategoryGet({
    page_size: 200,
  })
  if (response.status !== 200) return []

  return (response.data.results ?? [])
    .filter((item) => typeof item.id === "number")
    .map((item) => ({
      id: String(item.id),
      name: item.name,
      icon: item.icon || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getAlternativeOptionsServer() {
  const response = await listApiV1AlternativeProductGet({
    page_size: 200,
  })
  if (response.status !== 200) return []

  return (response.data.results ?? [])
    .filter((item) => typeof item.id === "number")
    .map((item) => ({
      id: String(item.id),
      slug: item.slug || null,
      name: item.name,
      websiteUrl: item.website_url || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getMemberProductConnectorServer(
  productId: string,
): Promise<GetMemberProductConnectorApiV1MemberProductsProductIdConnectorGet200 | null> {
  const token = await getServerAuthToken()
  if (!token) return null

  const response = await getMemberProductConnectorApiV1MemberProductsProductIdConnectorGet(
    productId,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
  if (response.status !== 200 || !response.data) return null
  return response.data
}
