"use client"

import { useUser } from "@clerk/nextjs"
import { useSearchParams } from "next/navigation"
import AuthViewShell from "@/components/layout/AuthViewShell"
import { OnboardingForm } from "./form"

export default function OnboardingPage() {
  const { user } = useUser()
  const searchParams = useSearchParams()
  const redirectTo = searchParams?.get("redirectTo") ?? undefined
  const redirectSource = searchParams?.get("source") ?? undefined

  return (
    <AuthViewShell>
      <div className="flex h-full w-full items-center justify-center px-4 lg:col-span-2 lg:px-10">
        <OnboardingForm
          firstName={user?.firstName}
          redirectTo={redirectTo}
          redirectSource={redirectSource}
        />
      </div>
    </AuthViewShell>
  )
}
