"use client"

import { useUser } from "@clerk/nextjs"
import AuthViewShell from "@/components/layout/AuthViewShell"
import OnboardingMarketingPanel from "@/components/organisms/OnboardingMarketingPanel"
import { OnboardingForm } from "./form"

export default function OnboardingPage() {
  const { user } = useUser()

  return (
    <AuthViewShell>
      <OnboardingMarketingPanel />
      <div className="flex h-full w-full items-center justify-center px-6 py-12 lg:px-16 lg:py-20">
        <OnboardingForm firstName={user?.firstName} />
      </div>
    </AuthViewShell>
  )
}
