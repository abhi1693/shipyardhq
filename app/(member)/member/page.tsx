import type { User as ClerkUser } from "@clerk/backend"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { syncUserFromClerk } from "@/actions/member/users/actions"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import {
  HOME_PATH,
  MEMBER_ONBOARDING_PATH,
  MEMBER_OVERVIEW_PATH,
} from "@/lib/routes"

type MemberIndexPageSearchParams = {
  redirectTo?: string | string[]
  source?: string | string[]
}

export default async function MemberIndexPage({
  searchParams,
}: {
  searchParams?: Promise<MemberIndexPageSearchParams | undefined>
}) {
  const resolvedSearchParams = await searchParams

  const { userId } = await auth()
  const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? HOME_PATH

  if (!userId) {
    redirect(signInPath)
  }

  let clerkUser: ClerkUser
  try {
    const client = await clerkClient()
    clerkUser = await client.users.getUser(userId)
  } catch (error) {
    console.error("Failed to fetch Clerk user for member index page", error)
    redirect(signInPath)
  }

  await syncUserFromClerk(clerkUser)

  await requireActiveUserOrRedirect(userId)

  const onboardingComplete =
    clerkUser.publicMetadata?.onboardingComplete === true

  if (onboardingComplete) {
    redirect(MEMBER_OVERVIEW_PATH)
  }

  const redirectToValue = resolvedSearchParams?.redirectTo
  const redirectSourceValue = resolvedSearchParams?.source

  const redirectToParam = Array.isArray(redirectToValue)
    ? redirectToValue[0]
    : redirectToValue
  const redirectSourceParam = Array.isArray(redirectSourceValue)
    ? redirectSourceValue[0]
    : redirectSourceValue

  const onboardingSearch = new URLSearchParams()
  if (redirectToParam) {
    onboardingSearch.set("redirectTo", redirectToParam)
  }
  if (redirectSourceParam) {
    onboardingSearch.set("source", redirectSourceParam)
  }

  const onboardingDestination = onboardingSearch.toString()
    ? `${MEMBER_ONBOARDING_PATH}?${onboardingSearch.toString()}`
    : MEMBER_ONBOARDING_PATH

  redirect(onboardingDestination)
}
