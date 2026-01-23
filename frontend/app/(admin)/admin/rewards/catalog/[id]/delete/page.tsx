import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteRewardCatalogItemAction } from "@/actions/admin/rewards/actions"
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

export default async function DeleteRewardCatalogItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect(adminStatusPath(["rewards", "catalog"], "invalid"))
  }

  const item = await prisma.rewardCatalogItem.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      featureKey: true,
      _count: {
        select: {
          redemptions: true,
          entitlements: true,
          placementSchedules: true,
          transactions: true,
        },
      },
    },
  })

  if (!item) {
    redirect(adminStatusPath(["rewards", "catalog"], "not-found"))
  }

  const catalogItemId = item.id
  const isLinked =
    item._count.redemptions > 0 ||
    item._count.entitlements > 0 ||
    item._count.placementSchedules > 0 ||
    item._count.transactions > 0

  async function handleDelete() {
    "use server"

    const result = await deleteRewardCatalogItemAction(catalogItemId)

    if (result && typeof result === "object" && "error" in result) {
      redirect(adminStatusPath(["rewards", "catalog"], "error"))
    }

    redirect(adminStatusPath(["rewards", "catalog"], "deleted"))
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Delete catalog item
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This will permanently delete{" "}
            <span className="font-medium text-foreground">{item.name}</span>{" "}
            <span className="font-mono text-xs">({item.featureKey})</span>.
          </p>
          {isLinked ? (
            <p className="font-medium text-foreground">
              This item is already referenced by existing records (redemptions,
              entitlements, placements, or transactions). Deletion will fail;
              disable it instead.
            </p>
          ) : (
            <p className="font-medium text-foreground">
              This action cannot be reversed.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("rewards", "catalog", catalogItemId, "edit")}>
              Cancel
            </Link>
          </Button>
          <form action={handleDelete}>
            <Button
              type="submit"
              variant="destructive"
              disabled={isLinked}
              aria-disabled={isLinked}
            >
              Delete catalog item
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
