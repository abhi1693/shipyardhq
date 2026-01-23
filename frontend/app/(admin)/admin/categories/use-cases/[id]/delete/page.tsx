import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteUseCaseAction } from "@/actions/admin/categories/actions"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import prisma from "@/lib/prisma"
import { adminPath, adminStatusPath } from "@/lib/routes"

export default async function DeleteUseCasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect(adminStatusPath(["categories", "use-cases"], "invalid"))
  }

  const useCase = await prisma.useCase.findUnique({
    where: { id },
    select: { id: true, label: true },
  })

  if (!useCase) {
    redirect(adminStatusPath(["categories", "use-cases"], "not-found"))
  }

  const useCaseId = useCase.id
  const useCaseLabel = useCase.label

  async function handleDelete() {
    "use server"

    const result = await deleteUseCaseAction(useCaseId)

    if (result && typeof result === "object" && "error" in result) {
      redirect(adminStatusPath(["categories", "use-cases"], "error"))
    }

    redirect(adminStatusPath(["categories", "use-cases"], "deleted"))
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Delete use case
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This will delete use case{" "}
            <span className="font-medium">{useCaseLabel}</span>.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("categories", "use-cases")}>Cancel</Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Delete use case
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
