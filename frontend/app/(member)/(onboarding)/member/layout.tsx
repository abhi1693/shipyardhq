import type { ReactNode } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { syncUserFromClerk } from "@/actions/member/users/actions"
import {
  HOME_PATH,
  MEMBER_BASE_PATH,
  MEMBER_ONBOARDING_PATH,
  MEMBER_OVERVIEW_PATH,
} from "@/lib/routes"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"

function resolvePostOnboardingDestination(nextUrl: string) {
  if (!nextUrl) {
    return MEMBER_OVERVIEW_PATH
  }

  const queryStart = nextUrl.indexOf("?")
  if (queryStart === -1) {
    return MEMBER_OVERVIEW_PATH
  }

  const search = new URLSearchParams(nextUrl.slice(queryStart + 1))
  const candidate = search.get("redirectTo")?.trim()
  if (!candidate) {
    return MEMBER_OVERVIEW_PATH
  }

  const isSafePath =
    candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.startsWith(MEMBER_ONBOARDING_PATH)

  if (!isSafePath) {
    return MEMBER_OVERVIEW_PATH
  }

  return candidate
}

export default async function MemberOnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  const { userId } = await auth()
  const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? HOME_PATH

  if (!userId) {
    redirect(signInPath)
  }

  try {
    const clerkUser = await getClerkUserByIdCached(userId)
    await syncUserFromClerk(clerkUser)
  } catch (error) {
    console.error("Failed to prepare onboarding user context", error)
    redirect(signInPath)
  }

  const activeUser = await requireActiveUserOrRedirect(userId)

  if (activeUser.onboardedAt) {
    const headerList = await headers()
    const nextUrl = headerList.get("next-url") ?? ""
    const candidate = resolvePostOnboardingDestination(nextUrl)

    const destination = candidate.startsWith(MEMBER_BASE_PATH)
      ? candidate
      : MEMBER_OVERVIEW_PATH

    redirect(destination)
  }

  return <>{children}</>
}
