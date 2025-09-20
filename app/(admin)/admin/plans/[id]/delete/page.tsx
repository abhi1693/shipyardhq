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

export default async function DeletePlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect("/admin/plans?status=invalid")
  }

  const plan = await prisma.plan.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!plan) {
    redirect("/admin/plans?status=not-found")
  }

  const planId = plan.id
  const planName = plan.name

  async function handleDelete() {
    "use server"

    const result = await deletePlanAction(planId)

    if (result && typeof result === "object" && "error" in result) {
      redirect("/admin/plans?status=error")
    }

    redirect("/admin/plans?status=deleted")
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
            <Link href="/admin/plans">Cancel</Link>
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
