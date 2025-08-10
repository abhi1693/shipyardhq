"use client"

import { useUser } from "@clerk/nextjs"
import { OnboardingForm } from "./form"

export default function OnboardingPage() {
  const { user } = useUser()

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <OnboardingForm firstName={user?.firstName} />
    </div>
  )
}

