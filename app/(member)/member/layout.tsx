import { headers } from "next/headers"
import { SidebarInset, SidebarProvider } from "@/components/atoms/sidebar"
import PrivateHeader from "@/components/layout/headers/private-header"
import AppSidebar from "@/components/layout/sidebar"
import { NavItem } from "@/types"
import { auth } from "@clerk/nextjs/server"
import PageContainer from "@/components/layout/page-container"
import { canOpenDodoBillingPortalByEmail } from "@/lib/dodoCustomerPortal"
import { syncCurrentUserBilling } from "@/lib/server/billing"
import MemberFooter from "@/components/layout/footers/member-footer"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import { IS_PROD } from "@/lib/constants"
import { syncUserFromClerk } from "@/actions/member/users/actions"
import { buildSectionMetadata } from "@/lib/metadata"
import { getClerkUserByIdCached } from "@/lib/server/clerkUsers"
import {
  ADMIN_OVERVIEW_PATH,
  HOME_PATH,
  MEMBER_FEEDBACK_PATH,
  MEMBER_ONBOARDING_PATH,
  MEMBER_ORGANIZATIONS_PATH,
  MEMBER_OVERVIEW_PATH,
  MEMBER_PRODUCTS_PATH,
  MEMBER_REWARDS_PATH,
} from "@/lib/routes"
import { redirect } from "next/navigation"

export const metadata = buildSectionMetadata({ section: "Member" })

const navItems: NavItem[] = [
  {
    title: "Overview",
    url: MEMBER_OVERVIEW_PATH,
    icon: "dashboard",
    isActive: false,
  },
  {
    title: "Rewards",
    url: MEMBER_REWARDS_PATH,
    icon: "points",
  },
  {
    title: "Products",
    url: MEMBER_PRODUCTS_PATH,
    icon: "product",
  },
  {
    title: "Organizations",
    url: MEMBER_ORGANIZATIONS_PATH,
    icon: "building",
  },
  {
    title: "Feedback",
    url: MEMBER_FEEDBACK_PATH,
    icon: "feedback",
  },
  {
    title: "Homepage",
    url: HOME_PATH,
    icon: "dashboard",
  },
]

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? HOME_PATH

  if (!userId) {
    redirect(signInPath)
  }

  try {
    const clerkUser = await getClerkUserByIdCached(userId)
    await syncUserFromClerk(clerkUser)
  } catch (error) {
    console.error("Failed to load active member context", error)
    redirect(signInPath)
  }

  const activeUser = await requireActiveUserOrRedirect(userId)

  try {
    await syncCurrentUserBilling()
  } catch (error) {
    console.error("Failed to sync current user billing", error)
  }

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
  const role = activeUser.role ?? "member"

  const items: NavItem[] = [...navItems]

  const isBillingPortalEnvEnabled = !(
    IS_PROD && (process.env.DODO_ENV?.trim() || "") === "test_mode"
  )

  let hasBillingPortal = false
  if (activeUser?.email) {
    hasBillingPortal = await canOpenDodoBillingPortalByEmail(activeUser.email)
  }

  const shouldShowBillingPortal = isBillingPortalEnvEnabled && hasBillingPortal

  if (
    role === "admin" &&
    !items.some(
      (item) => item.title === "Admin" || item.url === ADMIN_OVERVIEW_PATH,
    )
  ) {
    items.push({
      title: "Admin",
      url: ADMIN_OVERVIEW_PATH,
      icon: "settings",
      isActive: false,
    })
  }

  return (
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
  )
}
