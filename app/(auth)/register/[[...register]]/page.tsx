import { Metadata } from "next"
import { headers } from "next/headers"
import AuthViewShell from "@/components/layout/AuthViewShell"
import AuthMarketingPanel from "@/components/organisms/AuthMarketingPanel"
import AuthFormPanel from "@/components/organisms/AuthFormPanel"
import {
  type AuthRedirectSearchParams,
  resolveRedirectUrl,
} from "@/lib/auth/redirect"

export const metadata: Metadata = {
  title: "Register | ShipYardHQ.dev",
  description: "Create an account to list or discover micro-SaaS projects.",
}

export default async function RegisterViewPage({
  searchParams = {},
}: {
  searchParams?: AuthRedirectSearchParams
}) {
  const headerList = await headers()
  const requestHost = headerList.get("host")
  const redirectUrl = resolveRedirectUrl(searchParams, requestHost)

  return (
    <AuthViewShell>
      <AuthMarketingPanel />
      <AuthFormPanel mode="sign-up" redirectUrl={redirectUrl} />
    </AuthViewShell>
  )
}
