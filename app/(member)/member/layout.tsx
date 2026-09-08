import { headers } from "next/headers"
import { Suspense } from "react"
import { SidebarInset, SidebarProvider } from "@/components/atoms/sidebar"
import Providers from "@/components/layout/providers"
import PrivateHeader from "@/components/layout/headers/private-header"
import AppSidebar from "@/components/layout/sidebar"
import { NavItem } from "@/types"
import { auth } from "@clerk/nextjs/server"
import PageContainer from "@/components/layout/page-container"
import { canOpenDodoBillingPortalByEmail } from "@/lib/dodoCustomerPortal"
import MemberFooter from "@/components/layout/footers/member-footer"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import { IS_PROD } from "@/lib/constants"
import { syncUserFromClerk } from "@/lib/server/syncUserFromClerk"
import { buildSectionMetadata } from "@/lib/metadata"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import {
  HOME_PATH,
  MEMBER_ONBOARDING_PATH,
  MEMBER_OVERVIEW_PATH,
  MEMBER_PRODUCTS_PATH,
} from "@/lib/routes"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import PurchasePlanToast from "@/components/molecules/PurchasePlanToast"
import "./member.css"

export const metadata = buildSectionMetadata({ section: "Member" })

const navItems: NavItem[] = [
  {
    title: "Overview",
    url: MEMBER_OVERVIEW_PATH,
    icon: "dashboard",
    isActive: false,
  },
  {
    title: "Products",
    url: MEMBER_PRODUCTS_PATH,
    icon: "product",
  },
  {
    title: "Homepage",
    url: HOME_PATH,
    icon: "dashboard",
  },
]

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={null}>
      <MemberGate>{children}</MemberGate>
    </Suspense>
  )
}

async function MemberGate({ children }: { children: React.ReactNode }) {
  await connection()

  const { userId } = await auth.protect()
  const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? HOME_PATH

  try {
    const clerkUser = await getClerkUserByIdCached(userId)
    await syncUserFromClerk(clerkUser)
  } catch (error) {
    console.error("Failed to load active member context", error)
    redirect(signInPath)
  }

  const activeUser = await requireActiveUserOrRedirect(userId)

  if (!activeUser.onboardedAt) {
    const headerList = await headers()
    const nextUrl = headerList.get("next-url") ?? ""
    const safeRedirectTarget =
      nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : ""
    const isOnboardingUrl = safeRedirectTarget.startsWith(
      MEMBER_ONBOARDING_PATH,
    )
    const search = new URLSearchParams()
    if (safeRedirectTarget && !isOnboardingUrl) {
      search.set("redirectTo", safeRedirectTarget)
    }

    const onboardingDestination = search.toString()
      ? `${MEMBER_ONBOARDING_PATH}?${search.toString()}`
      : MEMBER_ONBOARDING_PATH

    redirect(onboardingDestination)
  }
  const items: NavItem[] = [...navItems]

  const isBillingPortalEnvEnabled = !(
    IS_PROD && (process.env.DODO_ENV?.trim() || "") === "test_mode"
  )

  let hasBillingPortal = false
  if (activeUser?.email) {
    hasBillingPortal = await canOpenDodoBillingPortalByEmail(activeUser.email)
  }

  const shouldShowBillingPortal = isBillingPortalEnvEnabled && hasBillingPortal

  return (
    <Providers>
      <PurchasePlanToast />
      <SidebarProvider defaultOpen>
        <AppSidebar
          navItems={items}
          showBillingPortal={shouldShowBillingPortal}
        />
        <SidebarInset>
          <PrivateHeader />
          <div className="flex-1">
            <PageContainer>{children}</PageContainer>
          </div>
          <MemberFooter />
        </SidebarInset>
      </SidebarProvider>
    </Providers>
  )
}
