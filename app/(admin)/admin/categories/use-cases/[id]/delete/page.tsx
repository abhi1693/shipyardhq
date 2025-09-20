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

export default async function DeleteUseCasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect("/admin/categories/use-cases?status=invalid")
  }

  const useCase = await prisma.useCase.findUnique({
    where: { id },
    select: { id: true, label: true },
  })

  if (!useCase) {
    redirect("/admin/categories/use-cases?status=not-found")
  }

  const useCaseId = useCase.id
  const useCaseLabel = useCase.label

  async function handleDelete() {
    "use server"

    const result = await deleteUseCaseAction(useCaseId)

    if (result && typeof result === "object" && "error" in result) {
      redirect("/admin/categories/use-cases?status=error")
    }

    redirect("/admin/categories/use-cases?status=deleted")
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
            <Link href="/admin/categories/use-cases">Cancel</Link>
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
