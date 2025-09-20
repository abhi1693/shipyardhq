import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteProductBadgeAction } from "@/actions/admin/badges/actions"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import prisma from "@/lib/prisma"

export default async function DeleteProductBadgePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect("/admin/products/assignments/badges?status=invalid")
  }

  const badge = await prisma.productBadge.findUnique({
    where: { id },
    select: {
      id: true,
      badge: true,
      product: { select: { id: true, name: true } },
    },
  })

  if (!badge) {
    redirect("/admin/products/assignments/badges?status=not-found")
  }

  const badgeId = badge.id
  const badgeName = badge.badge
  const productName = badge.product.name

  async function handleDelete() {
    "use server"

    const result = await deleteProductBadgeAction(badgeId)

    if (result && typeof result === "object" && "error" in result) {
      redirect("/admin/products/assignments/badges?status=error")
    }

    redirect("/admin/products/assignments/badges?status=deleted")
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Remove badge assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Badge <span className="font-medium">{badgeName}</span> will be
            removed from <span className="font-medium">{productName}</span>.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/products/assignments/badges">Cancel</Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Remove badge
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
