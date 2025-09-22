import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteUserAction } from "@/actions/admin/users/actions"
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

export default async function DeleteAdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect(adminStatusPath(["users"], "invalid"))
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, firstName: true, lastName: true },
  })

  if (!user) {
    redirect(adminStatusPath(["users"], "not-found"))
  }

  const userId = user.id

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ")
  const displayName = fullName.length ? fullName : user.email

  async function handleDelete() {
    "use server"

    const result = await deleteUserAction(userId)

    if (result && typeof result === "object" && "error" in result) {
      redirect(adminStatusPath(["users"], "error"))
    }

    redirect(adminStatusPath(["users"], "deleted"))
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Delete user
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            You are about to delete{" "}
            <span className="font-medium">{displayName}</span>.
          </p>
          <p>
            This will remove the account and any related access immediately.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("users")}>
              Cancel
            </Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Delete user
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
