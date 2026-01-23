"use client"

import { UserProfile } from "@clerk/nextjs"
import { MEMBER_ACCOUNT_PROFILE_PATH } from "@/lib/routes"

export default function MemberAccountProfile() {
  return (
    <div className="p-2 sm:p-4">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-2 sm:p-4">
        <UserProfile
          routing="path"
          path={MEMBER_ACCOUNT_PROFILE_PATH}
          appearance={{
            variables: {
              colorPrimary: "oklch(0.52 0.24 262)",
              colorBackground: "var(--color-card)",
              borderRadius: "var(--radius-md)",
            },
          }}
        />
      </div>
    </div>
  )
}
