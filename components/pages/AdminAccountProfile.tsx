"use client"

import { UserProfile } from "@clerk/nextjs"

export default function AdminAccountProfile() {
  return (
    <div className="p-2 sm:p-4">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-2 sm:p-4">
        <UserProfile
          routing="path"
          path="/admin/account/profile"
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
