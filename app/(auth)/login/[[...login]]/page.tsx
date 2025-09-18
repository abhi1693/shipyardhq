import { Metadata } from "next"
import AuthViewShell from "@/components/layout/AuthViewShell"
import AuthMarketingPanel from "@/components/organisms/AuthMarketingPanel"
import AuthFormPanel from "@/components/organisms/AuthFormPanel"

export const metadata: Metadata = {
  title: "Sign in | ShipYardHQ.dev",
  description: "Sign in to list, discover, and explore micro-SaaS tools.",
}

export default function LoginViewPage() {
  return (
    <AuthViewShell>
      <AuthMarketingPanel />
      <AuthFormPanel mode="sign-in" />
    </AuthViewShell>
  )
}
