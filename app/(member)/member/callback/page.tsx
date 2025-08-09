import { auth, clerkClient } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { syncUserFromClerk } from "@/actions/member/users/actions"

export default async function CallbackPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/")
  }

  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)
  const onboardingComplete =
    clerkUser.publicMetadata?.onboardingComplete === true

  await syncUserFromClerk(clerkUser)

  redirect(onboardingComplete ? "/member/overview" : "/member/onboarding")
}
