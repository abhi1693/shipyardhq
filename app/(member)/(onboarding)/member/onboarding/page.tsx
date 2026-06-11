"use client"

import { useUser } from "@clerk/nextjs"
import { useSearchParams } from "next/navigation"
import { OnboardingForm } from "./form"

export default function OnboardingPage() {
  const { user } = useUser()
  const searchParams = useSearchParams()
  const redirectTo = searchParams?.get("redirectTo") ?? undefined
  const redirectSource = searchParams?.get("source") ?? undefined

  return (
    <OnboardingForm
      firstName={user?.firstName}
      redirectTo={redirectTo}
      redirectSource={redirectSource}
    />
  )
}
