import type { Metadata } from "next"
import { SidebarInset, SidebarProvider } from "@/components/atoms/sidebar"
import PrivateHeader from "@/components/layout/headers/private-header"
import AppSidebar from "@/components/layout/sidebar"
import { NavItem } from "@/types"
import PageContainer from "@/components/layout/page-container"
import AdminFooter from "@/components/layout/footers/admin-footer"

export const metadata: Metadata = {
  title: "Admin - ShipYardHQ",
  description: "Admin dashboard for managing ShipYard.",
}

const navItems: NavItem[] = [
  {
    title: "Overview",
    url: "/admin/overview",
    icon: "dashboard",
    isActive: false,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: "user",
  },
  {
    title: "Organizations",
    url: "/admin/organizations",
    icon: "building",
  },
  {
    title: "Categories",
    url: "#",
    icon: "category",
    items: [
      {
        title: "Categories",
        url: "/admin/categories",
        icon: "category",
      },
      {
        title: "Use Cases",
        url: "/admin/categories/use-cases",
        icon: "link",
      },
      {
        title: "Assigned Use Cases",
        url: "/admin/categories/use-cases/assignments",
        icon: "link",
      },
    ],
  },
  {
    title: "Products",
    url: "#",
    icon: "product",
    items: [
      {
        title: "Products",
        url: "/admin/products",
        icon: "product",
      },
      {
        title: "Assigned Badges",
        url: "/admin/products/assignments/badges",
        icon: "link",
      },
    ],
  },
  {
    title: "Plans",
    url: "#",
    icon: "settings",
    items: [
      {
        title: "Plans",
        url: "/admin/plans",
        icon: "product",
      },
      {
        title: "Features",
        url: "/admin/plans/features",
        icon: "settings",
      },
      {
        title: "Assignments",
        url: "/admin/plans/assignments",
        icon: "link",
      },
    ],
  },
  {
    title: "Account",
    url: "#",
    icon: "billing",
    items: [
      {
        title: "Profile",
        url: "/admin/account/profile",
      },
    ],
  },
  {
    title: "Member Area",
    url: "/member/overview",
    icon: "member",
  },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar navItems={navItems} />
      <SidebarInset>
        <PrivateHeader />
        <div className="flex-1">
          <PageContainer>{children}</PageContainer>
        </div>
        <AdminFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
