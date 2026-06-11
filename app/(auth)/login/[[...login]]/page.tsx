import { headers } from "next/headers"
import Providers from "@/components/layout/providers"
import AuthLoginPanel from "@/components/organisms/AuthLoginPanel"
import {
  type AuthRedirectSearchParams,
  resolveRedirectUrl,
} from "@/lib/auth/redirect"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Sign in",
  description: "Sign in to list, discover, and explore micro-SaaS tools.",
})

export default async function LoginViewPage({
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
      <AuthLoginPanel redirectUrl={redirectUrl} />
    </Providers>
  )
}
