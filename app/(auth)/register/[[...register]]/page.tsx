import { Metadata } from "next"
import AuthViewShell from "@/components/layout/AuthViewShell"
import AuthMarketingPanel from "@/components/organisms/AuthMarketingPanel"
import AuthFormPanel from "@/components/organisms/AuthFormPanel"

export const metadata: Metadata = {
  title: "Register | ShipYardHQ.dev",
  description: "Create an account to list or discover micro-SaaS projects.",
}

export default function RegisterViewPage() {
  return (
    <AuthViewShell>
      <AuthMarketingPanel />
      <AuthFormPanel mode="sign-up" />
    </AuthViewShell>
  )
}
