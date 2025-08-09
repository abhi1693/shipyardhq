import { Metadata } from "next"
import AuthMarketingPanel from "@/components/organisms/AuthMarketingPanel"
import AuthFormPanel from "@/components/organisms/AuthFormPanel"

export const metadata: Metadata = {
  title: "Sign in | ShipYardHQ.dev",
  description: "Sign in to list, discover, and explore micro-SaaS tools.",
}

export default function LoginViewPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthMarketingPanel />
      <AuthFormPanel mode="sign-in" />
    </div>
  )
}
