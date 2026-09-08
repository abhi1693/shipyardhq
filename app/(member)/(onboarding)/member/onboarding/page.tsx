import { auth } from "@clerk/nextjs/server"

import OnboardingClient from "./client"

export default async function OnboardingPage() {
  await auth.protect()

  return <OnboardingClient />
}
