import { Metadata } from "next"
import AuthMarketingPanel from "@/components/organisms/AuthMarketingPanel"
import AuthFormPanel from "@/components/organisms/AuthFormPanel"

export const metadata: Metadata = {
  title: "Register | ShipYardHQ.dev",
  description: "Create an account to list or discover micro-SaaS projects.",
}

export default function RegisterViewPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthMarketingPanel />
      <AuthFormPanel mode="sign-up" />
    </div>
  )
}
