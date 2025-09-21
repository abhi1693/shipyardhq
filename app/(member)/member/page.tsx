import type { User as ClerkUser } from "@clerk/backend"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { syncUserFromClerk } from "@/actions/member/users/actions"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"

export default async function MemberIndexPage() {
  const { userId } = await auth()
  const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/"

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

  redirect(onboardingComplete ? "/member/overview" : "/member/onboarding")
}
