import { SidebarTrigger } from "@/components/atoms/sidebar"
import { Separator } from "@/components/atoms/separator"
import { Breadcrumbs } from "@/components/molecules/BreadCrumbs"
import { UserNav } from "@/components/layout/user-nav"
import NotificationBell from "@/components/molecules/NotificationBell"
import { auth } from "@clerk/nextjs/server"
import { getRewardBalanceByClerkId } from "@/lib/server/rewards/balance"

async function getCurrentUserRewardBalance(): Promise<number | null> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  return getRewardBalanceByClerkId(clerkUserId)
}

export default async function PrivateHeader() {
  const rewardBalance = await getCurrentUserRewardBalance()
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-2 px-4">
        <NotificationBell />
        <UserNav rewardBalance={rewardBalance ?? 0} />
      </div>
    </header>
  )
}
