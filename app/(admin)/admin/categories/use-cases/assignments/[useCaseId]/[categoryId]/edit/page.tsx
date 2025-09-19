import { Metadata } from "next"
import prisma from "@/lib/prisma"
import {
  getUseCases,
  getCategories,
  updateUseCaseAssignmentAction,
} from "@/actions/admin/categories/actions"
import EditAssignmentForm from "./form"
import { notFound } from "next/navigation"
import { buildPageMetadata } from "@/lib/metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ useCaseId: string; categoryId: string }>
}): Promise<Metadata> {
  const { useCaseId, categoryId } = await params

  const assignment = await prisma.useCaseCategory.findUnique({
    where: { useCaseId_categoryId: { useCaseId, categoryId } },
    include: { useCase: true, category: true },
  })

  if (!assignment) {
    return buildPageMetadata({
      title: "Edit Use Case Assignment",
      section: "Admin",
      description: "Modify use-case to category assignment.",
    })
  }

  const useCaseLabel = assignment.useCase?.label ?? "Use Case"
  const categoryName = assignment.category?.name ?? "Category"

  return buildPageMetadata({
    title: `Edit ${useCaseLabel} to ${categoryName}`,
    section: "Admin",
    description: `Modify the ${useCaseLabel} to ${categoryName} assignment.`,
  })
}

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ useCaseId: string; categoryId: string }>
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
