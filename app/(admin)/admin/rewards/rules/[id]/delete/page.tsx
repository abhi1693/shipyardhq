import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteRewardRuleAction } from "@/actions/admin/rewards/actions"
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

export default async function DeleteRewardRulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect(adminStatusPath(["rewards", "rules"], "invalid"))
  }

  const rule = await prisma.rewardRule.findUnique({
    where: { id },
    select: { id: true, name: true, key: true },
  })

  if (!rule) {
    redirect(adminStatusPath(["rewards", "rules"], "not-found"))
  }

  const ruleId = rule.id

  async function handleDelete() {
    "use server"

    const result = await deleteRewardRuleAction(ruleId)

    if (result && typeof result === "object" && "error" in result) {
      redirect(adminStatusPath(["rewards", "rules"], "error"))
    }

    redirect(adminStatusPath(["rewards", "rules"], "deleted"))
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Delete reward rule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This will permanently delete{" "}
            <span className="font-medium text-foreground">{rule.name}</span>{" "}
            <span className="font-mono text-xs">({rule.key})</span>.
          </p>
          <p className="font-medium text-foreground">
            Existing transactions will remain, but future awards for this rule
            will fail.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("rewards", "rules", ruleId, "edit")}>
              Cancel
            </Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Delete rule
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
