import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteOrganizationAction } from "@/actions/admin/organizations/actions"
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

export default async function DeleteAdminOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect(adminStatusPath(["organizations"], "invalid"))
  }

  const organization = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!organization) {
    redirect(adminStatusPath(["organizations"], "not-found"))
  }

  const organizationId = organization.id
  const organizationName = organization.name

  async function handleDelete() {
    "use server"

    const result = await deleteOrganizationAction(organizationId)

    if (result && typeof result === "object" && "error" in result) {
      redirect(adminStatusPath(["organizations"], "error"))
    }

    redirect(adminStatusPath(["organizations"], "deleted"))
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Delete organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            You are about to delete{" "}
            <span className="font-medium">{organizationName}</span>.
          </p>
          <p>This will remove related memberships and product associations.</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("organizations")}>Cancel</Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Delete organization
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
