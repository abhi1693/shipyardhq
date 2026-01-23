import * as React from "react"

import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { TableSkeleton } from "@/components/atoms/table.skeleton"
import { cn } from "@/lib/utils"

interface AdminObjectPageSkeletonProps extends React.ComponentProps<"div"> {
  overviewRows?: number
  sidebarSections?: number
  sidebarCardLines?: number
  relationshipSections?: number
  relationshipColumns?: number
  relationshipRows?: number
  actionCount?: number
  showSlug?: boolean
}

export function AdminObjectPageSkeleton({
  className,
  overviewRows = 6,
  sidebarSections = 0,
  sidebarCardLines = 4,
  relationshipSections = 2,
  relationshipColumns = 4,
  relationshipRows = 5,
  actionCount = 2,
  showSlug = true,
  ...props
}: AdminObjectPageSkeletonProps) {
  const extras = Math.max(0, sidebarSections)
  const relationships = Math.max(0, relationshipSections)
  const actions = Math.max(0, actionCount)

  return (
    <div
      className={cn("space-y-6", className)}
      data-slot="admin-object-page-skeleton"
      aria-hidden="true"
      {...props}
    >
      <header className="border-b pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <HeadingSkeleton lines={1} />
            <Skeleton
              className="h-2.5 w-60 rounded-full"
              tone="muted"
              shimmer={false}
            />
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: actions }).map((_, index) => (
              <ButtonSkeleton
                key={index}
                size="sm"
                variant={index === 0 ? "outline" : "default"}
                labelWidth={index === actions - 1 ? "5.5rem" : "4.5rem"}
              />
            ))}
          </div>
        </div>
        {showSlug ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <Skeleton
              className="h-2.5 w-28 rounded-full"
              tone="muted"
              shimmer={false}
            />
            <Skeleton
              className="h-2.5 w-48 rounded-full"
              tone="muted"
              shimmer={false}
            />
          </div>
        ) : null}
      </header>

      <section className="space-y-6">
        <CardSkeleton
          lines={overviewRows}
          showHeader={false}
          tone="soft"
          className="shadow-sm"
        />

        {extras > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: extras }).map((_, index) => (
              <CardSkeleton
                key={index}
                lines={sidebarCardLines}
                showHeader
                actionWidth="4.5rem"
              />
            ))}
          </div>
        ) : null}
      </section>

      {relationships > 0 ? (
        <div className="space-y-8">
          {Array.from({ length: relationships }).map((_, index) => (
            <section
              key={index}
              className="space-y-4 rounded-2xl border border-border/60 bg-white/85 p-4 shadow-sm"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <HeadingSkeleton lines={1} />
                <div className="flex items-center gap-2">
                  <ButtonSkeleton
                    size="sm"
                    variant="outline"
                    labelWidth="4.75rem"
                  />
                  <ButtonSkeleton size="sm" labelWidth="6rem" />
                </div>
              </div>
              <TableSkeleton
                columns={relationshipColumns}
                rows={relationshipRows}
                showHeader
              />
            </section>
          ))}
        </div>
      ) : null}
    </div>
  )
}
