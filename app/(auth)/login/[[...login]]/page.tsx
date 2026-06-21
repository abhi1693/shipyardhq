import { headers } from "next/headers"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"
import Providers from "@/components/layout/providers"
import AuthLoginPanel from "@/components/organisms/AuthLoginPanel"
import {
  type AuthRedirectSearchParams,
  resolveRedirectUrl,
} from "@/lib/auth/redirect"
import { buildPageMetadata } from "@/lib/metadata"
import { MEMBER_BASE_PATH } from "@/lib/routes"

export const metadata = buildPageMetadata({
  title: "Sign in",
  description: "Sign in to list, discover, and explore micro-SaaS tools.",
})

export default function LoginViewPage({
  searchParams,
}: {
  searchParams?: Promise<AuthRedirectSearchParams>
}) {
  return (
    <Suspense fallback={null}>
      <LoginView searchParams={searchParams} />
    </Suspense>
  )
}

async function LoginView({
  searchParams,
}: {
  searchParams?: Promise<AuthRedirectSearchParams>
}) {
  await connection()

  const resolvedSearchParams = searchParams ? await searchParams : {}
  const headerList = await headers()
  const requestHost = headerList.get("host")
  const redirectUrl = resolveRedirectUrl(resolvedSearchParams, requestHost)
  const { userId } = await auth()

  if (userId) {
    redirect(redirectUrl ?? MEMBER_BASE_PATH)
  }

  return (
    <Providers>
      <AuthLoginPanel redirectUrl={redirectUrl} />
    </Providers>
  )
}
