import { headers } from "next/headers"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"
import Providers from "@/components/layout/providers"
import AuthRegisterPanel from "@/components/organisms/AuthRegisterPanel"
import {
  type AuthRedirectSearchParams,
  resolveRedirectUrl,
} from "@/lib/auth/redirect"
import { buildPageMetadata } from "@/lib/metadata"
import { MEMBER_BASE_PATH } from "@/lib/routes"

export const metadata = buildPageMetadata({
  title: "Register",
  description: "Create an account to list or discover micro-SaaS projects.",
})

export default function RegisterViewPage({
  searchParams,
}: {
  searchParams?: Promise<AuthRedirectSearchParams>
}) {
  return (
    <Suspense fallback={null}>
      <RegisterView searchParams={searchParams} />
    </Suspense>
  )
}

async function RegisterView({
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
      <AuthRegisterPanel redirectUrl={redirectUrl} />
    </Providers>
  )
}
