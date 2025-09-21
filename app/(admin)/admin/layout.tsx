import { SidebarInset, SidebarProvider } from "@/components/atoms/sidebar"
import PrivateHeader from "@/components/layout/headers/private-header"
import AppSidebar from "@/components/layout/sidebar"
import { NavItem } from "@/types"
import PageContainer from "@/components/layout/page-container"
import AdminFooter from "@/components/layout/footers/admin-footer"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { requireActiveUserOrRedirect } from "@/lib/server/userStatus"
import { buildSectionMetadata } from "@/lib/metadata"
import { getFeedbackCount } from "@/actions/admin/feedback/actions"

export const metadata = buildSectionMetadata({
  section: "Admin",
  description: "Admin dashboard for managing ShipYardHQ.",
})

const baseNavItems: NavItem[] = [
  {
    title: "Overview",
    url: "/admin/overview",
    icon: "dashboard",
    isActive: false,
  },
  {
    title: "Analytics",
    url: "#",
    icon: "analytics",
    items: [
      {
        title: "Traffic",
        url: "/admin/analytics/traffic",
        icon: "analytics",
      },
      {
        title: "Onboarding",
        url: "/admin/analytics/onboarding",
        icon: "user",
      },
      {
        title: "Growth",
        url: "/admin/analytics/growth",
        icon: "dashboard",
      },
    ],
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: "user",
  },
  {
    title: "Notifications",
    url: "#",
    icon: "bell",
    items: [
      {
        title: "Email broadcasts",
        url: "/admin/notifications",
        icon: "bell",
      },
      {
        title: "Builder outreach",
        url: "/admin/notifications/outreach",
        icon: "link",
      },
    ],
  },
  {
    title: "Feedback",
    url: "/admin/feedback",
    icon: "feedback",
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
  const { userId } = await auth()
  if (!userId) {
    redirect(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/")
  }

  const pendingFeedbackCountPromise = getFeedbackCount({
    status: "received",
  }).catch(() => 0)

  await requireActiveUserOrRedirect(userId)

  const pendingFeedbackCount = await pendingFeedbackCountPromise

  const navItems = baseNavItems.map((item) => {
    if (item.title !== "Feedback") return item
    return {
      ...item,
      label:
        pendingFeedbackCount > 0 ? String(pendingFeedbackCount) : undefined,
    }
  })

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
