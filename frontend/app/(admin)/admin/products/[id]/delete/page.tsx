import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteProductAction } from "@/actions/admin/products/actions"
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

export default async function DeleteAdminProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect(adminStatusPath(["products"], "invalid"))
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  })

  if (!product) {
    redirect(adminStatusPath(["products"], "not-found"))
  }

  const productId = product.id
  const productName = product.name

  async function handleDelete() {
    "use server"

    const result = await deleteProductAction(productId)

    if (result && typeof result === "object" && "error" in result) {
      redirect(adminStatusPath(["products"], "error"))
    }

    redirect(adminStatusPath(["products"], "deleted"))
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Delete <span className="font-medium">{productName}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This will permanently remove the product and its related records.
          </p>
          <p className="font-medium text-foreground">
            This action cannot be reversed.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("products", productId)}>Cancel</Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Delete product
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
