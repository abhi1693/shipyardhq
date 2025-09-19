import { getPlans } from "@/actions/admin/plans/actions"
import { getPlanFeatures } from "@/actions/admin/plans/features/actions"
import AddAssignmentForm from "./form"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Assign Feature to Plan",
  section: "Admin",
  description: "Create a new plan-feature assignment.",
})

export default async function AddAssignmentPage() {
  const plans = await getPlans({ select: { id: true, name: true } })
  const features = await getPlanFeatures({
    select: { id: true, name: true, key: true },
  })

  return <AddAssignmentForm plans={plans} features={features} />
}
