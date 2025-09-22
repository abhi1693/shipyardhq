import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteOrganizationMembershipAction } from "@/actions/admin/organizations/actions"
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

export default async function DeleteOrganizationMembershipPage({
  params,
}: {
  params: Promise<{ id: string; membershipId: string }>
}) {
  const { id, membershipId } = await params

  if (!id || !membershipId) {
    redirect(adminStatusPath(["organizations"], "invalid"))
  }

  const membership = await prisma.organizationMembership.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      organizationId: true,
      user: { select: { email: true } },
    },
  })

  if (!membership || membership.organizationId !== id) {
    redirect(adminStatusPath(["organizations", id], "not-found"))
  }

  const membershipKey = membership.id
  const memberEmail = membership.user?.email ?? "this member"
  const organizationId = id

  async function handleDelete() {
    "use server"

    const result = await deleteOrganizationMembershipAction(membershipKey)

    if (result && typeof result === "object" && "error" in result) {
      redirect(adminStatusPath(["organizations", id], "error"))
    }

    redirect(
      adminStatusPath(["organizations", organizationId], "member-removed"),
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Remove organization member
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This will remove <span className="font-medium">{memberEmail}</span>{" "}
            from the organization immediately.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("organizations", organizationId)}>
              Cancel
            </Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Remove member
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
