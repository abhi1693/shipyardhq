import { headers } from "next/headers"
import { SidebarInset, SidebarProvider } from "@/components/atoms/sidebar"
import PrivateHeader from "@/components/layout/headers/private-header"
import AppSidebar from "@/components/layout/sidebar"
import { NavItem } from "@/types"
import { auth } from "@clerk/nextjs/server"
import PageContainer from "@/components/layout/page-container"
import {
  ensureBillingPortalEligibility,
  getCachedBillingPortalEligibility,
} from "@/lib/dodoCustomerPortal"
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
  MEMBER_NOTIFICATIONS_PATH,
} from "@/lib/routes"
import { redirect } from "next/navigation"

export const metadata = buildSectionMetadata({ section: "Member" })

type SyncMap = Map<string, number>

const globalMemberSyncState = globalThis as unknown as {
  __memberClerkSyncMap?: SyncMap
  __memberBillingSyncMap?: SyncMap
}

const CLERK_SYNC_INTERVAL_MS = 15 * 60 * 1000
const BILLING_SYNC_INTERVAL_MS = 5 * 60 * 1000

function getSyncMap(key: "clerk" | "billing"): SyncMap {
  const storeKey =
    key === "clerk" ? "__memberClerkSyncMap" : "__memberBillingSyncMap"
  if (!globalMemberSyncState[storeKey]) {
    globalMemberSyncState[storeKey] = new Map<string, number>()
  }
  return globalMemberSyncState[storeKey]!
}

function reserveSync(key: "clerk" | "billing", id: string, ttlMs: number) {
  const map = getSyncMap(key)
  const now = Date.now()
  const last = map.get(id)
  if (last && now - last < ttlMs) {
    return false
  }
  map.set(id, now)
  return true
}

function releaseSync(key: "clerk" | "billing", id: string) {
  getSyncMap(key).delete(id)
}

function finalizeSync(key: "clerk" | "billing", id: string) {
  getSyncMap(key).set(id, Date.now())
}

async function syncClerkUserInBackground(clerkId: string) {
  try {
    const clerkUser = await getClerkUserByIdCached(clerkId)
    await syncUserFromClerk(clerkUser)
    finalizeSync("clerk", clerkId)
  } catch (error) {
    releaseSync("clerk", clerkId)
    console.error("Failed to sync Clerk user in background", {
      clerkId,
      error,
    })
  }
}

async function syncBillingInBackground(clerkId: string) {
  try {
    await syncCurrentUserBilling()
    finalizeSync("billing", clerkId)
  } catch (error) {
    releaseSync("billing", clerkId)
    console.error("Failed to sync billing in background", {
      clerkId,
      error,
    })
  }
}

const navItems: NavItem[] = [
  {
    title: "Overview",
    url: MEMBER_OVERVIEW_PATH,
    icon: "dashboard",
    isActive: false,
  },
  {
    title: "Notifications",
    url: MEMBER_NOTIFICATIONS_PATH,
    icon: "bell",
  },
  {
    title: "Rewards",
    url: MEMBER_REWARDS_PATH,
    icon: "rewards",
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

  if (reserveSync("clerk", userId, CLERK_SYNC_INTERVAL_MS)) {
    void syncClerkUserInBackground(userId)
  }

  const activeUser = await requireActiveUserOrRedirect(userId)

  if (reserveSync("billing", userId, BILLING_SYNC_INTERVAL_MS)) {
    void syncBillingInBackground(userId)
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
    hasBillingPortal = await getCachedBillingPortalEligibility(activeUser.email)
    void ensureBillingPortalEligibility(activeUser.email)
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
