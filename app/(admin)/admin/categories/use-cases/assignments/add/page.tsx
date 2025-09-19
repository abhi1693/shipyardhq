import { getUseCases, getCategories } from "@/actions/admin/categories/actions"
import AddAssignmentForm from "./form"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Assign Use Case to Category",
  section: "Admin",
  description: "Create a new use-case assignment.",
})

export default async function AddUseCaseAssignmentPage() {
  const useCases = await getUseCases()
  const categories = await getCategories()

  return <AddAssignmentForm useCases={useCases} categories={categories} />
}
