"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { Users, Clock, UserPlus } from "lucide-react"
import { formatDistanceToNow } from "@/lib/ui/formatters"
import {
  memberOrganizationMemberAddPath,
  memberOrganizationMemberDeletePath,
} from "@/lib/routes"

type MemberRow = {
  id: string
  user: { id: string; email: string; firstName: string; lastName: string }
  createdAt: string | Date
  isOwner?: boolean
}

function formatName(row: MemberRow) {
  const full = `${row.user.firstName ?? ""} ${row.user.lastName ?? ""}`.trim()
  return full.length ? full : row.user.email
}

export function MemberOrganizationMembersRelationship({
  rows,
  organizationId,
  canManage,
}: {
  rows: MemberRow[]
  organizationId: string
  canManage: boolean
}) {
  return (
    <Card className="border border-transparent bg-white/90 shadow-none">
      <CardHeader className="flex flex-col gap-3 border-b border-slate-200/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Team roster
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Track who has access to this workspace and manage invitations.
          </CardDescription>
        </div>
        {canManage ? (
          <Button asChild size="sm">
            <Link href={memberOrganizationMemberAddPath(organizationId)}>
              <UserPlus className="h-4 w-4" /> Invite member
            </Link>
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="px-0">
        {rows.length === 0 ? (
          <div className="px-6 py-6">
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
              No members yet. Invite collaborators to start building together.
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/70">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {formatName(row)}
                    </span>
                    {row.isOwner ? (
                      <Badge
                        variant="success"
                        className="rounded-full px-2 py-0.5 text-[11px]"
                      >
                        Owner
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.user.email}
                  </p>
                </div>

                <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-6">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {formatDistanceToNow(new Date(row.createdAt))}
                  </span>
                  {!row.isOwner && canManage ? (
                    <Link
                      href={memberOrganizationMemberDeletePath(
                        organizationId,
                        row.id,
                      )}
                      className="text-xs font-semibold text-red-600 transition hover:text-red-700 hover:underline"
                    >
                      Remove
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <Users className="h-3.5 w-3.5 text-slate-300" />
                      {row.isOwner ? "Owner" : "Member"}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
