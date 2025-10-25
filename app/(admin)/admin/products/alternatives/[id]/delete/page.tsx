import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteAlternativeProductAction } from "@/actions/admin/alternative-products/actions"
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

export default async function DeleteAlternativeProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect(adminStatusPath(["alternatives"], "invalid"))
  }

  const alternative = await prisma.alternativeProduct.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      products: { select: { id: true } },
    },
  })

  if (!alternative) {
    redirect(adminStatusPath(["alternatives"], "not-found"))
  }

  const linkedProducts = alternative.products.length

  async function handleDelete() {
    "use server"

    const result = await deleteAlternativeProductAction(alternative.id)

    if (result && typeof result === "object" && "error" in result) {
      redirect(adminStatusPath(["alternatives"], "error"))
    }

    redirect(adminStatusPath(["alternatives"], "deleted"))
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Delete alternative
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This will permanently remove <span className="font-medium">{alternative.name}</span>
            {linkedProducts > 0 ? (
              <>
                {" "}and detach it from <span className="font-medium">{linkedProducts}</span>{" "}
                linked product{linkedProducts === 1 ? "" : "s"}.
              </>
            ) : (
              "."
            )}
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("alternatives", alternative.id)}>Cancel</Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Delete alternative
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
