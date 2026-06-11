import { headers } from "next/headers"
import Providers from "@/components/layout/providers"
import AuthRegisterPanel from "@/components/organisms/AuthRegisterPanel"
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
      <AuthRegisterPanel redirectUrl={redirectUrl} />
    </Providers>
  )
}
