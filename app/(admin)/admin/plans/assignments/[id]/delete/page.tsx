import Link from "next/link"
import { redirect } from "next/navigation"

import { deletePlanFeatureAssignmentAction } from "@/actions/admin/plans/assignments/actions"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import prisma from "@/lib/prisma"

export default async function DeletePlanAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect("/admin/plans/assignments?status=invalid")
  }

  const assignment = await prisma.planFeatureAssignment.findUnique({
    where: { id },
    select: {
      id: true,
      plan: { select: { id: true, name: true } },
      feature: { select: { id: true, name: true } },
    },
  })

  if (!assignment) {
    redirect("/admin/plans/assignments?status=not-found")
  }

  const assignmentId = assignment.id
  const planName = assignment.plan.name
  const featureName = assignment.feature.name

  async function handleDelete() {
    "use server"

    const result = await deletePlanFeatureAssignmentAction(assignmentId)

    if (result && typeof result === "object" && "error" in result) {
      redirect("/admin/plans/assignments?status=error")
    }

    redirect("/admin/plans/assignments?status=deleted")
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Remove plan feature assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Feature <span className="font-medium">{featureName}</span> will be
            removed from plan
            <span className="font-medium">{planName}</span>.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/plans/assignments">Cancel</Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Remove feature
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
