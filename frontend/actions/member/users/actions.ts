"use server"

import { type User as ClerkUser } from "@clerk/backend"
import { auth } from "@clerk/nextjs/server"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import {
  INACTIVE_ACCOUNT_MESSAGE,
  invalidateActiveUserCache,
} from "@/lib/server/userStatus"
import {
  ensureNovuSubscriber,
  isNovuEnabled,
} from "@/lib/server/notifications/novu"
import { fastapiFetch, type FastApiError } from "@/lib/fastapi-fetcher"

type ApiResponse<T> = {
  data: T
  status: number
  headers: Headers
}

type MemberActiveUser = {
  id: string
  status: string
}

async function getAuthToken() {
  const authResult = await auth()
  if (!authResult.userId || !authResult.getToken) return null
  return authResult.getToken().catch(() => null)
}

async function getMemberMeByToken(
  authToken: string,
): Promise<MemberActiveUser | null> {
  try {
    const response = await fastapiFetch<ApiResponse<MemberActiveUser>>(
      "/api/v1/member/me",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    )
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

export async function syncUserFromClerk(clerkUser: ClerkUser) {
  const email = clerkUser.emailAddresses[0]?.emailAddress
  const firstName = clerkUser.firstName ?? null
  const lastName = clerkUser.lastName ?? null

  if (!email) {
    throw new Error("Clerk user email is required but missing.")
  }

  const authResult = await auth()
  if (!authResult.userId || authResult.userId !== clerkUser.id) {
    throw new Error("Unauthenticated")
  }

  const authToken = await getAuthToken()
  if (!authToken) {
    throw new Error("Unauthenticated")
  }

  try {
    const response = await fastapiFetch<ApiResponse<MemberActiveUser>>(
      "/api/v1/member/me/sync",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
        }),
      },
    )
    if (response.status !== 200 || !response.data) {
      throw new Error("Unable to sync user profile.")
    }
  } catch (error) {
    const status = (error as FastApiError | undefined)?.status
    if (status === 403) {
      throw new Error(INACTIVE_ACCOUNT_MESSAGE)
    }
    throw error
  }

  if (isNovuEnabled()) {
    try {
      await ensureNovuSubscriber({
        subscriberId: clerkUser.id,
        email,
        firstName,
        lastName,
        avatar: clerkUser.imageUrl ?? null,
      })
    } catch (error) {
      console.error("[novu] failed to sync subscriber", {
        error,
        clerkId: clerkUser.id,
      })
    }
  }

  await invalidateActiveUserCache(clerkUser.id)
}

export async function getUserByClerkId(clerkId: string) {
  if (!clerkId) {
    return null
  }

  const authResult = await auth()
  if (!authResult.userId || authResult.userId !== clerkId) {
    return null
  }

  const authToken = await getAuthToken()
  if (!authToken) {
    return null
  }

  const user = await getMemberMeByToken(authToken)

  if (user?.status === "active") {
    return { id: user.id }
  }

  try {
    const clerkUser = await getClerkUserByIdCached(clerkId)
    await syncUserFromClerk(clerkUser)
  } catch (error) {
    console.error("Failed to sync user from Clerk:", error)
    return null
  }

  const refreshedToken = await getAuthToken()
  if (!refreshedToken) {
    return null
  }
  const refreshedUser = await getMemberMeByToken(refreshedToken)

  if (!refreshedUser || refreshedUser.status !== "active") {
    return null
  }

  return { id: refreshedUser.id }
}
