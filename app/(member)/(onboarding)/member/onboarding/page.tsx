"use client"

import { useUser } from "@clerk/nextjs"
import { useSearchParams } from "next/navigation"
import AuthViewShell from "@/components/layout/AuthViewShell"
import OnboardingMarketingPanel from "@/components/organisms/OnboardingMarketingPanel"
import { OnboardingForm } from "./form"

export default function OnboardingPage() {
  const { user } = useUser()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") ?? undefined
  const redirectSource = searchParams.get("source") ?? undefined

  return (
    <AuthViewShell>
      <OnboardingMarketingPanel />
      <div className="flex h-full w-full items-center justify-center px-5 py-10 lg:px-12 lg:py-14">
        <OnboardingForm
          firstName={user?.firstName}
          redirectTo={redirectTo}
          redirectSource={redirectSource}
        />
      </div>
    </AuthViewShell>
  )
}
