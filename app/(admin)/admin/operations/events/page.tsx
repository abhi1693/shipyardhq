import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

import {
  getEventEnvelopesPaginated,
  requeueEnvelopeAction,
  deleteEnvelopeAction,
} from "@/actions/admin/events/actions"
import { adminPath } from "@/lib/routes"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/table"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Heading } from "@/components/atoms/heading"
import type { EventEnvelopeStatus } from "@/lib/vendor/prisma/client"

export const dynamic = "force-dynamic"

const statusVariantMap: Record<
  EventEnvelopeStatus,
  "default" | "secondary" | "outline" | "destructive" | "success"
> = {
  pending: "secondary",
  processing: "outline",
  retrying: "default",
  completed: "success",
  dead_letter: "destructive",
}

type SearchParams = {
  page?: string
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

function formatRelative(date?: Date | null) {
  if (!date) return "—"
  return formatDistanceToNow(date, { addSuffix: true })
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const page = toInt(sp?.page, 1)

  const {
    items,
    total,
    page: currentPage,
    pageSize,
  } = await getEventEnvelopesPaginated({ page })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const prevPage = currentPage > 1 ? currentPage - 1 : null
  const nextPage = currentPage < totalPages ? currentPage + 1 : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Heading
          title="Events"
          description="Browse and manage asynchronous envelopes across the entire queue."
        />
        <Button asChild variant="outline">
          <Link href={adminPath("analytics", "events")}>View analytics</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">
            Envelopes
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {total.toLocaleString()} total
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-slate-200/70 bg-white/80 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Enqueued</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No envelopes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-sm">
                        <div className="flex flex-col gap-1">
                          <Link
                            href={adminPath("operations", "events", item.id)}
                            className="text-sm font-semibold text-slate-900 hover:underline"
                          >
                            {item.event}
                          </Link>
                          <span className="font-mono text-[11px] text-slate-500">
                            {item.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariantMap[item.status]}>
                          {item.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-900">
                          {item.attempts}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.pendingHandlers.length}/
                          {item.asyncHandlers.length} pending
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelative(item.enqueuedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelative(item.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <form action={requeueEnvelopeAction}>
                            <input
                              type="hidden"
                              name="envelopeId"
                              value={item.id}
                            />
                            <Button type="submit" size="sm" variant="outline">
                              Requeue
                            </Button>
                          </form>
                          <form action={deleteEnvelopeAction}>
                            <input
                              type="hidden"
                              name="envelopeId"
                              value={item.id}
                            />
                            <Button type="submit" size="sm" variant="destructive">
                              Delete
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              Showing {items.length} of {total.toLocaleString()} envelopes
            </div>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" size="sm" disabled={!prevPage}>
                <Link
                  href={
                    prevPage
                      ? `${adminPath("operations", "events")}?page=${prevPage}`
                      : "#"
                  }
                  aria-disabled={!prevPage}
                >
                  Previous
                </Link>
              </Button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <Button asChild variant="outline" size="sm" disabled={!nextPage}>
                <Link
                  href={
                    nextPage
                      ? `${adminPath("operations", "events")}?page=${nextPage}`
                      : "#"
                  }
                  aria-disabled={!nextPage}
                >
                  Next
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
