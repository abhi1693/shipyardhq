import type { Metadata } from "next"
import { SidebarInset, SidebarProvider } from "@/components/atoms/sidebar"
import PrivateHeader from "@/components/layout/headers/private-header"
import AppSidebar from "@/components/layout/sidebar"
import { NavItem } from "@/types"
import { auth } from "@clerk/nextjs/server"
import PageContainer from "@/components/layout/page-container"
import { syncCurrentUserBilling } from "@/lib/server/billing"

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
    icon: "team",
  },
  {
    title: "Account",
    url: "#",
    icon: "billing",
    items: [
      {
        title: "Profile",
        url: "/member/account/profile",
        icon: "user",
      },
    ],
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
  await syncCurrentUserBilling()

  const { sessionClaims } = await auth()
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
      <AppSidebar navItems={items} />
      <SidebarInset>
        <PrivateHeader />
        <PageContainer>{children}</PageContainer>
      </SidebarInset>
    </SidebarProvider>
  )
}
