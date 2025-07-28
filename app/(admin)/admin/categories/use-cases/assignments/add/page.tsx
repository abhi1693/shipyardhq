import { getCategories, getUseCases } from "@/actions/admin/categories/actions"
import AddUseCaseAssignmentForm from "./form"

export default async function AddUseCaseAssignmentPage() {
  const [categories, useCases] = await Promise.all([
    getCategories(),
    getUseCases(),
  ])

  return (
    <AddUseCaseAssignmentForm categories={categories} useCases={useCases} />
  )
}
