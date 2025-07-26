import type { Metadata } from "next"
import { SidebarInset, SidebarProvider } from "@/components/atoms/sidebar"
import Header from "@/components/layout/header"
import AppSidebar from "@/components/layout/sidebar"
import { NavItem } from "@/types"

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
