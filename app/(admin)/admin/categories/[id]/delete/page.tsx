import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteCategoryAction } from "@/actions/admin/categories/actions"
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

export default async function DeleteCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect(adminStatusPath(["categories"], "invalid"))
  }

  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!category) {
    redirect(adminStatusPath(["categories"], "not-found"))
  }

  const categoryId = category.id
  const categoryName = category.name

  async function handleDelete() {
    "use server"

    const result = await deleteCategoryAction(categoryId)

    if (result && typeof result === "object" && "error" in result) {
      redirect(adminStatusPath(["categories"], "error"))
    }

    redirect(adminStatusPath(["categories"], "deleted"))
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Delete category
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This will delete category{" "}
            <span className="font-medium">{categoryName}</span> and detach it
            from associated products.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("categories")}>
              Cancel
            </Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Delete category
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
