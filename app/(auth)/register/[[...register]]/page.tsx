import { headers } from "next/headers"
import AuthViewShell from "@/components/layout/AuthViewShell"
import Providers from "@/components/layout/providers"
import AuthMarketingPanel from "@/components/organisms/AuthMarketingPanel"
import AuthFormPanel from "@/components/organisms/AuthFormPanel"
import {
  type AuthRedirectSearchParams,
  resolveRedirectUrl,
} from "@/lib/auth/redirect"
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
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const headerList = await headers()
  const requestHost = headerList.get("host")
  const redirectUrl = resolveRedirectUrl(resolvedSearchParams, requestHost)

  return (
    <Providers>
      <AuthViewShell>
        <AuthMarketingPanel />
        <AuthFormPanel mode="sign-up" redirectUrl={redirectUrl} />
      </AuthViewShell>
    </Providers>
  )
}
