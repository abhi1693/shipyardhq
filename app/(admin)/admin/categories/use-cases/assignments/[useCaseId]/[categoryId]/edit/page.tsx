import { Metadata } from "next"
import prisma from "@/lib/prisma"
import { getUseCases, getCategories, updateUseCaseAssignmentAction } from "@/actions/admin/categories/actions"
import EditAssignmentForm from "./form"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Edit Use Case Assignment",
  description: "Modify use-case to category assignment",
}

export default async function EditAssignmentPage({
  params,
}: {
  params: { useCaseId: string; categoryId: string }
}) {
  const { useCaseId, categoryId } = await params

  const assignment = await prisma.useCaseCategory.findUnique({
    where: { useCaseId_categoryId: { useCaseId, categoryId } },
    include: { useCase: true, category: true },
  })
  if (!assignment) return notFound()

  const [useCases, categories] = await Promise.all([
    getUseCases({ select: { id: true, label: true, slug: true } }),
    getCategories({ select: { id: true, name: true, slug: true } }),
  ])

  return (
    <EditAssignmentForm
      prev={{ useCaseId, categoryId }}
      useCases={useCases}
      categories={categories}
      initial={{ useCaseId, categoryId }}
      onSubmitAction={updateUseCaseAssignmentAction}
    />
  )
}

