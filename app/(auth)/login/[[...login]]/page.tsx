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
  title: "Sign in | ShipYardHQ.dev",
  description: "Sign in to list, discover, and explore micro-SaaS tools.",
}

export default async function LoginViewPage({
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
      <AuthFormPanel mode="sign-in" redirectUrl={redirectUrl} />
    </AuthViewShell>
  )
}
