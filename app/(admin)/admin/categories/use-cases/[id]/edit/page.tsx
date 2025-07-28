import { notFound } from "next/navigation"
import { Metadata } from "next"
import EditUseCaseForm from "./form"
import { getUseCaseById } from "@/actions/admin/categories/actions"

export const metadata: Metadata = {
  title: "Edit Use Case",
  description: "Modify use case details",
}

export default async function EditUseCasePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const useCase = await getUseCaseById(id)
  if (!useCase) return notFound()

  return <EditUseCaseForm id={useCase.id} label={useCase.label} />
}
