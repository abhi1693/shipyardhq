import { headers } from "next/headers"
import AuthViewShell from "@/components/layout/AuthViewShell"
import AuthMarketingPanel from "@/components/organisms/AuthMarketingPanel"
import AuthFormPanel from "@/components/organisms/AuthFormPanel"
import AuthUnavailablePanel from "@/components/organisms/AuthUnavailablePanel"
import {
  type AuthRedirectSearchParams,
  resolveRedirectUrl,
} from "@/lib/auth/redirect"
import { AUTH_TEMPORARILY_DISABLED } from "@/lib/auth/availability"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Register",
  description: "Create an account to list or discover micro-SaaS projects.",
})

export default async function RegisterViewPage({
  searchParams,
}: {
  searchParams?: Promise<AuthRedirectSearchParams>
}) {
  if (AUTH_TEMPORARILY_DISABLED) {
    return (
      <AuthViewShell>
        <AuthMarketingPanel />
        <AuthUnavailablePanel mode="sign-up" />
      </AuthViewShell>
    )
  }

  const resolvedSearchParams = searchParams ? await searchParams : {}
  const headerList = await headers()
  const requestHost = headerList.get("host")
  const redirectUrl = resolveRedirectUrl(resolvedSearchParams, requestHost)

  return (
    <AuthViewShell>
      <AuthMarketingPanel />
      <AuthFormPanel mode="sign-up" redirectUrl={redirectUrl} />
    </AuthViewShell>
  )
}
