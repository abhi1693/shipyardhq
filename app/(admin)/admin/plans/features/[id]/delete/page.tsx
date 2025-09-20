import Link from "next/link"
import { redirect } from "next/navigation"

import { deletePlanFeatureAction } from "@/actions/admin/plans/features/actions"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import prisma from "@/lib/prisma"

export default async function DeletePlanFeaturePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect("/admin/plans/features?status=invalid")
  }

  const feature = await prisma.planFeature.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!feature) {
    redirect("/admin/plans/features?status=not-found")
  }

  const featureId = feature.id
  const featureName = feature.name

  async function handleDelete() {
    "use server"

    const result = await deletePlanFeatureAction(featureId)

    if (result && typeof result === "object" && "error" in result) {
      redirect("/admin/plans/features?status=error")
    }

    redirect("/admin/plans/features?status=deleted")
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Delete plan feature
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This will delete feature{" "}
            <span className="font-medium">{featureName}</span>.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/plans/features">Cancel</Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Delete feature
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
