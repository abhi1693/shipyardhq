import { Metadata } from "next"
import { getUseCases, getCategories } from "@/actions/admin/categories/actions"
import AddAssignmentForm from "./form"

export const metadata: Metadata = {
  title: "Assign Use Case to Category",
  description: "Create a new use-case assignment",
}

export default async function AddUseCaseAssignmentPage() {
  const useCases = await getUseCases()
  const categories = await getCategories()

  return <AddAssignmentForm useCases={useCases} categories={categories} />
}

