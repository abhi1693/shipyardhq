import { SidebarInset, SidebarProvider } from "@/components/atoms/sidebar"
import PrivateHeader from "@/components/layout/headers/private-header"
import AppSidebar from "@/components/layout/sidebar"
import { NavItem } from "@/types"
import { auth, clerkClient } from "@clerk/nextjs/server"
import PageContainer from "@/components/layout/page-container"
import { canOpenDodoBillingPortalByEmail } from "@/lib/dodoCustomerPortal"
import { syncCurrentUserBilling } from "@/lib/server/billing"
import MemberFooter from "@/components/layout/footers/member-footer"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import { IS_PROD } from "@/lib/constants"
import { syncUserFromClerk } from "@/actions/member/users/actions"
import { buildSectionMetadata } from "@/lib/metadata"

export const metadata = buildSectionMetadata({ section: "Member" })

const navItems: NavItem[] = [
  {
    title: "Overview",
    url: "/member/overview",
    icon: "dashboard",
    isActive: false,
  },
  {
    title: "Products",
    url: "/member/products",
    icon: "product",
  },
  {
    title: "Organizations",
    url: "/member/organizations",
    icon: "building",
  },
  {
    title: "Feedback",
    url: "/member/feedback",
    icon: "feedback",
  },
  {
    title: "Homepage",
    url: "/",
    icon: "dashboard",
  },
]

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { sessionClaims, userId } = await auth()
  type ActiveUser = Awaited<ReturnType<typeof requireActiveUserOrRedirect>>
  let activeUser: ActiveUser | null = null
  if (userId) {
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    await syncUserFromClerk(clerkUser)
    activeUser = await requireActiveUserOrRedirect(userId)
    await syncCurrentUserBilling()
  }
  const role = sessionClaims?.metadata.role || "member"

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
      (item) => item.title === "Admin" || item.url === "/admin/overview",
    )
  ) {
    items.push({
      title: "Admin",
      url: "/admin/overview",
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
