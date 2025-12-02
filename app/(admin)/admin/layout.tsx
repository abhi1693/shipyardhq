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
import {
  ADMIN_OVERVIEW_PATH,
  adminPath,
  MEMBER_OVERVIEW_PATH,
} from "@/lib/routes"

export const metadata = buildSectionMetadata({
  section: "Admin",
  description: "Admin dashboard for managing ShipYardHQ.",
})

const baseNavItems: NavItem[] = [
  {
    title: "Overview",
    url: ADMIN_OVERVIEW_PATH,
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
        url: adminPath("analytics", "traffic"),
        icon: "analytics",
      },
      {
        title: "Revenue",
        url: adminPath("analytics", "revenue"),
        icon: "analytics",
      },
      {
        title: "Onboarding",
        url: adminPath("analytics", "onboarding"),
        icon: "user",
      },
      {
        title: "Intent retention",
        url: adminPath("analytics", "intent-retention"),
        icon: "analytics",
      },
      {
        title: "Growth",
        url: adminPath("analytics", "growth"),
        icon: "dashboard",
      },
      {
        title: "Product updates",
        url: adminPath("analytics", "product-updates"),
        icon: "updates",
      },
      {
        title: "Rewards",
        url: adminPath("analytics", "rewards"),
        icon: "rewards",
      },
      {
        title: "Events",
        url: adminPath("analytics", "events"),
        icon: "queue",
      },
    ],
  },
  {
    title: "Events",
    url: adminPath("operations", "events"),
    icon: "queue",
  },
  {
    title: "Users",
    url: adminPath("users"),
    icon: "user",
  },
  {
    title: "Notifications",
    url: "#",
    icon: "bell",
    items: [
      {
        title: "Email broadcasts",
        url: adminPath("notifications"),
        icon: "bell",
      },
      {
        title: "Newsletter subscribers",
        url: adminPath("notifications", "newsletter"),
        icon: "member",
      },
      {
        title: "Builder outreach",
        url: adminPath("notifications", "outreach"),
        icon: "link",
      },
    ],
  },
  {
    title: "Feedback",
    url: adminPath("feedback"),
    icon: "feedback",
  },
  {
    title: "Organizations",
    url: adminPath("organizations"),
    icon: "building",
  },
  {
    title: "Categories",
    url: "#",
    icon: "category",
    items: [
      {
        title: "Categories",
        url: adminPath("categories"),
        icon: "category",
      },
      {
        title: "Use Cases",
        url: adminPath("categories", "use-cases"),
        icon: "link",
      },
      {
        title: "Assigned Use Cases",
        url: adminPath("categories", "use-cases", "assignments"),
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
        url: adminPath("products"),
        icon: "product",
      },
      {
        title: "Alternatives",
        url: adminPath("products", "alternatives"),
        icon: "compass",
      },
      {
        title: "Assigned Badges",
        url: adminPath("products", "assignments", "badges"),
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
        url: adminPath("plans"),
        icon: "product",
      },
      {
        title: "Features",
        url: adminPath("plans", "features"),
        icon: "settings",
      },
      {
        title: "Assignments",
        url: adminPath("plans", "assignments"),
        icon: "link",
      },
    ],
  },
  {
    title: "Rewards",
    url: "#",
    icon: "rewards",
    items: [
      {
        title: "Reward rules",
        url: adminPath("rewards", "rules"),
        icon: "settings",
      },
      {
        title: "Reward catalog",
        url: adminPath("rewards", "catalog"),
        icon: "product",
      },
      {
        title: "Transactions",
        url: adminPath("rewards", "transactions"),
        icon: "analytics",
      },
      {
        title: "Refund redemptions",
        url: adminPath("rewards", "refunds"),
        icon: "rewards",
      },
      {
        title: "Adjust rewards",
        url: adminPath("rewards", "adjust"),
        icon: "rewards",
      },
    ],
  },
  {
    title: "Member Area",
    url: MEMBER_OVERVIEW_PATH,
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

  const activeUser = await requireActiveUserOrRedirect(userId)

  if (activeUser.role !== "admin") {
    redirect(MEMBER_OVERVIEW_PATH)
  }

  const pendingFeedbackCount = await pendingFeedbackCountPromise

  const navItems = baseNavItems.map((item) => {
    if (item.title === "Feedback") {
      return {
        ...item,
        label:
          pendingFeedbackCount > 0 ? String(pendingFeedbackCount) : undefined,
      }
    }

    return item
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
