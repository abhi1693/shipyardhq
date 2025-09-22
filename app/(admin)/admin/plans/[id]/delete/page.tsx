import Link from "next/link"
import { redirect } from "next/navigation"

import { deletePlanAction } from "@/actions/admin/plans/actions"
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

export default async function DeletePlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect(adminStatusPath(["plans"], "invalid"))
  }

  const plan = await prisma.plan.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!plan) {
    redirect(adminStatusPath(["plans"], "not-found"))
  }

  const planId = plan.id
  const planName = plan.name

  async function handleDelete() {
    "use server"

    const result = await deletePlanAction(planId)

    if (result && typeof result === "object" && "error" in result) {
      redirect(adminStatusPath(["plans"], "error"))
    }

    redirect(adminStatusPath(["plans"], "deleted"))
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Delete plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            You are about to delete plan{" "}
            <span className="font-medium">{planName}</span>.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("plans")}>
              Cancel
            </Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Delete plan
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
