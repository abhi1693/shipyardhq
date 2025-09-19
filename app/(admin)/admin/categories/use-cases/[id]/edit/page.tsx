import { notFound } from "next/navigation"
import { Metadata } from "next"
import EditUseCaseForm from "./form"
import { getUseCaseById } from "@/actions/admin/categories/actions"
import { buildPageMetadata } from "@/lib/metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const useCase = await getUseCaseById(id)

  if (!useCase) {
    return buildPageMetadata({
      title: "Edit Use Case",
      section: "Admin",
      description: "Modify use case details.",
    })
  }

  return buildPageMetadata({
    title: `Edit ${useCase.label}`,
    section: "Admin",
    description: `Modify the ${useCase.label} use case details.`,
  })
}

export default async function EditUseCasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const useCase = await getUseCaseById(id)
  if (!useCase) return notFound()

  return <EditUseCaseForm id={useCase.id} label={useCase.label} />
}
