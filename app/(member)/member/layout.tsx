import type { Metadata } from "next"
import { SidebarInset, SidebarProvider } from "@/components/atoms/sidebar"
import PrivateHeader from "@/components/layout/headers/private-header"
import AppSidebar from "@/components/layout/sidebar"
import { NavItem } from "@/types"
import { auth } from "@clerk/nextjs/server"
import PageContainer from "@/components/layout/page-container"
import { syncCurrentUserBilling } from "@/lib/server/billing"
import MemberFooter from "@/components/layout/footers/member-footer"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"

export const metadata: Metadata = {
  title: "ShipYardHQ",
}

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
  if (userId) {
    await requireActiveUserOrRedirect(userId)
    await syncCurrentUserBilling()
  }
  const role = sessionClaims?.metadata.role || "member"

  const items: NavItem[] = [...navItems]

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
      <AppSidebar navItems={items} showCustomerPortal />
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
