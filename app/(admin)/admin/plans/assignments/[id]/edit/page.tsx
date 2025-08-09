import { notFound } from "next/navigation"
import prisma from "@/lib/prisma"
import EditAssignmentForm from "./form"
import { getPlans } from "@/actions/admin/plans/actions"
import { getPlanFeatures } from "@/actions/admin/plans/features/actions"

export default async function EditAssignmentPage({
  params,
}: {
  params: { id: string }
}) {
  const assignment = await prisma.planFeatureAssignment.findUnique({
    where: { id: params.id },
    include: {
      plan: true,
      feature: true,
    },
  })

  if (!assignment) return notFound()

  const plans = await getPlans({ select: { id: true, name: true } })
  const features = await getPlanFeatures({
    select: { id: true, name: true, key: true },
  })

  return (
    <EditAssignmentForm
      assignment={assignment}
      plans={plans}
      features={features}
    />
  )
}
