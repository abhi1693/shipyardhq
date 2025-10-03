import AdjustPointsForm from "@/components/pages/admin/points/AdjustPointsForm"
import { buildPageMetadata } from "@/lib/metadata"
import prisma from "@/lib/prisma"

export const metadata = buildPageMetadata({
  title: "Adjust points",
  section: "Admin",
  description: "Grant or deduct points from a member manually.",
})

export default async function AdjustPointsPage() {
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

  return <AdjustPointsForm users={users} />
}
