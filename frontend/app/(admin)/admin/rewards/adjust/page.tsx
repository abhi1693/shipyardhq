import AdjustRewardsForm from "@/components/pages/admin/rewards/AdjustRewardsForm"
import { buildPageMetadata } from "@/lib/metadata"
import prisma from "@/lib/prisma"

export const metadata = buildPageMetadata({
  title: "Adjust rewards",
  section: "Admin",
  description: "Grant or deduct rewards from a member manually.",
})

export default async function AdjustRewardsPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { email: "asc" },
    take: 200,
  })

  return <AdjustRewardsForm users={users} />
}
