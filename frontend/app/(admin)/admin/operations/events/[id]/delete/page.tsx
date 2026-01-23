import Link from "next/link"
import { redirect } from "next/navigation"

import { adminPath } from "@/lib/routes"
import {
  deleteEnvelopeAction,
  getEventEnvelopeDetail,
} from "@/actions/admin/events/actions"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"

export const dynamic = "force-dynamic"

async function resolveEnvelope(id: string) {
  const envelope = await getEventEnvelopeDetail(id)
  if (!envelope) {
    redirect(adminPath("operations", "events"))
  }
  return envelope
}

export default async function DeleteEventEnvelopePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const envelope = await resolveEnvelope(id)

  async function handleDelete() {
    "use server"

    const formData = new FormData()
    formData.append("envelopeId", envelope.id)
    await deleteEnvelopeAction(formData)
    redirect(adminPath("operations", "events"))
  }

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-2xl font-bold">
            Delete envelope
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            You are about to delete
            <span className="ml-1 font-medium text-foreground">
              {envelope.event}
            </span>
            .
          </p>
          <p className="font-mono text-xs text-slate-500">ID: {envelope.id}</p>
          <p>
            This removes all recorded attempts, errors, and metadata for the
            envelope. Continue only if you are sure the work item is no longer
            needed.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={adminPath("operations", "events", envelope.id)}>
              Cancel
            </Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Delete envelope
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
