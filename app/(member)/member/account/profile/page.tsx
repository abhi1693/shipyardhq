import { auth } from "@clerk/nextjs/server"

import MemberAccountProfile from "@/components/pages/MemberAccountProfile"
import { buildPageMetadata } from "@/lib/metadata"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

export const metadata = buildPageMetadata({
  title: "Account Profile",
})

export default async function Page() {
  const { userId } = await auth()
  const profile = userId ? await getActiveUserByClerkId(userId) : null

  return (
    <MemberAccountProfile
      profile={
        profile
          ? {
              email: profile.email,
              firstName: profile.firstName,
              lastName: profile.lastName,
              role: profile.role,
              status: profile.status,
              createdAt: profile.createdAt.toISOString(),
            }
          : null
      }
    />
  )
}
