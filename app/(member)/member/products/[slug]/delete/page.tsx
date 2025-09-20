import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteProductAction } from "@/actions/admin/products/actions"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { getActiveUserByClerkId } from "@/lib/server/userStatus"

export default async function DeleteMemberProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (!slug) {
    redirect("/member/products?status=invalid")
  }

  const { userId: clerkId } = await auth()
  if (!clerkId) {
    redirect("/member/products?status=unauthorized")
  }

  const currentUser = await getActiveUserByClerkId(clerkId)
  if (!currentUser) {
    redirect("/member/products?status=unauthorized")
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      userId: true,
      organizationId: true,
    },
  })

  if (!product) {
    redirect("/member/products?status=not-found")
  }

  const ownsProduct = product.userId === currentUser.id
  let belongsToOrg = false
  if (!ownsProduct && product.organizationId) {
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        organizationId: product.organizationId,
        userId: currentUser.id,
      },
      select: { id: true },
    })
    belongsToOrg = Boolean(membership)
  }

  if (!ownsProduct && !belongsToOrg) {
    redirect("/member/products?status=unauthorized")
  }

  const productId = product.id
  const productName = product.name

  async function handleDelete() {
    "use server"

    const result = await deleteProductAction(productId)

    if (result && typeof result === "object" && "error" in result) {
      redirect("/member/products?status=error")
    }

    redirect("/member/products?status=deleted")
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
          <p>Deleting this product removes it from Shipyard immediately.</p>
          <p>This action cannot be undone.</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href="/member/products">Cancel</Link>
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
