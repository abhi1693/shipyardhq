import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteUseCaseAssignmentAction } from "@/actions/admin/categories/actions"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import prisma from "@/lib/prisma"

export default async function DeleteUseCaseAssignmentPage({
  params,
}: {
  params: Promise<{ useCaseId: string; categoryId: string }>
}) {
  const { useCaseId, categoryId } = await params

  if (!useCaseId || !categoryId) {
    redirect("/admin/categories/use-cases/assignments?status=invalid")
  }

  const assignment = await prisma.useCaseCategory.findUnique({
    where: {
      useCaseId_categoryId: {
        useCaseId,
        categoryId,
      },
    },
    select: {
      useCase: { select: { id: true, label: true } },
      category: { select: { id: true, name: true } },
    },
  })

  if (!assignment) {
    redirect("/admin/categories/use-cases/assignments?status=not-found")
  }

  const assignmentUseCaseId = useCaseId
  const assignmentCategoryId = categoryId
  const useCaseLabel = assignment.useCase.label
  const categoryName = assignment.category.name

  async function handleDelete() {
    "use server"

    const result = await deleteUseCaseAssignmentAction({
      useCaseId: assignmentUseCaseId,
      categoryId: assignmentCategoryId,
    })

    if (result && typeof result === "object" && "error" in result) {
      redirect("/admin/categories/use-cases/assignments?status=error")
    }

    redirect("/admin/categories/use-cases/assignments?status=deleted")
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Remove use case assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Use case <span className="font-medium">{useCaseLabel}</span> will be
            detached from category{" "}
            <span className="font-medium">{categoryName}</span>.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/categories/use-cases/assignments">Cancel</Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Remove assignment
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
