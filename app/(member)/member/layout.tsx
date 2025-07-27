import type { Metadata } from "next"
import { SidebarInset, SidebarProvider } from "@/components/atoms/sidebar"
import Header from "@/components/layout/header"
import AppSidebar from "@/components/layout/sidebar"
import { NavItem } from "@/types"
import { auth } from "@clerk/nextjs/server"

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
]

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { sessionClaims } = await auth()
  const role = sessionClaims?.metadata.role || "member"

  if (role === "admin") {
    navItems.push({
      title: "Admin",
      url: "/admin/overview",
      icon: "settings",
      isActive: false,
    })
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar navItems={navItems} />
      <SidebarInset>
        <Header />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
