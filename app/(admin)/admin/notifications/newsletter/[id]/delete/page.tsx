import Link from "next/link"
import { redirect } from "next/navigation"

import { deleteNewsletterSubscriberAction } from "@/actions/admin/newsletter/actions"
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

export default async function DeleteNewsletterSubscriberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    redirect(adminStatusPath(["notifications", "newsletter"], "invalid"))
  }

  const subscriber = await prisma.newsletterSubscription.findUnique({
    where: { id },
    select: { id: true, email: true },
  })

  if (!subscriber) {
    redirect(adminStatusPath(["notifications", "newsletter"], "not-found"))
  }

  const subscriberId = subscriber.id
  const subscriberEmail = subscriber.email

  async function handleDelete() {
    "use server"

    const result = await deleteNewsletterSubscriberAction(subscriberId)

    if (result && typeof result === "object" && "error" in result) {
      redirect(adminStatusPath(["notifications", "newsletter"], "error"))
    }

    redirect(adminStatusPath(["notifications", "newsletter"], "deleted"))
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Remove Subscriber
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            You are about to remove {" "}
            <span className="font-medium text-foreground">
              {subscriberEmail}
            </span>{" "}
            from the newsletter list.
          </p>
          <p>This action is immediate and cannot be undone.</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("notifications", "newsletter")}>Cancel</Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Delete subscriber
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
