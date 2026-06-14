import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

function OverviewPanelSkeleton() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <Skeleton className="h-5 w-24 rounded-full" tone="soft" />
      </div>
      <div className="divide-y p-6 pt-0 text-sm">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="grid grid-cols-3 items-start gap-4 py-3">
            <Skeleton className="h-4 w-24 rounded-full" tone="muted" />
            <div className="col-span-2">
              <Skeleton
                className={
                  index === 0
                    ? "h-4 w-56 max-w-full rounded-full"
                    : index % 3 === 0
                      ? "h-6 w-28 rounded"
                      : "h-4 w-40 max-w-full rounded-full"
                }
                tone={index % 3 === 0 ? "soft" : "muted"}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SideCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6 pb-0">
        <Skeleton className="h-5 w-40 rounded-full" tone="soft" />
      </div>
      <div className="space-y-4 p-6 text-sm">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-full" tone="muted" />
            <Skeleton
              className="h-4 w-full max-w-72 rounded-full"
              tone="muted"
            />
          </div>
        ))}
        <Skeleton className="h-10 w-full rounded-lg" tone="soft" />
      </div>
    </div>
  )
}

function RelationshipTableSkeleton() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col gap-3 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48 rounded-full" tone="soft" />
          <Skeleton className="h-4 w-72 max-w-full rounded-full" tone="muted" />
        </div>
        <ButtonSkeleton size="sm" labelWidth="8rem" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="bg-muted/40">
              {Array.from({ length: 4 }).map((_, index) => (
                <th key={index} className="px-4 py-3 text-left">
                  <Skeleton className="h-3 w-24 rounded-full" tone="muted" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {Array.from({ length: 4 }).map((__, columnIndex) => (
                  <td key={columnIndex} className="px-4 py-4">
                    <Skeleton
                      className={
                        columnIndex === 0
                          ? "h-4 w-44 rounded-full"
                          : columnIndex === 3
                            ? "ml-auto h-8 w-20 rounded-lg"
                            : "h-4 w-28 rounded-full"
                      }
                      tone={columnIndex === 3 ? "soft" : "muted"}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function MemberProductDetailSkeleton() {
  return (
    <div data-slot="member-product-detail-skeleton" aria-hidden="true">
      <div className="border-b bg-background px-4 py-6 md:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-9 w-80 max-w-full rounded-lg" tone="soft" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-4 w-32 rounded-full" tone="muted" />
              <Skeleton className="h-4 w-40 rounded-full" tone="muted" />
              <Skeleton className="h-4 w-28 rounded-full" tone="muted" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <ButtonSkeleton size="sm" labelWidth="7rem" />
            <ButtonSkeleton size="sm" variant="outline" labelWidth="8rem" />
            <ButtonSkeleton size="sm" variant="outline" labelWidth="8rem" />
            <ButtonSkeleton size="sm" variant="outline" labelWidth="6rem" />
          </div>
        </div>
      </div>

      <div className="w-full bg-muted py-6">
        <div className="w-full px-4 md:px-6">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-4">
              <OverviewPanelSkeleton />
            </div>
            <aside className="col-span-12 lg:col-span-4">
              <div className="space-y-4">
                <SideCardSkeleton rows={3} />
              </div>
            </aside>
            <aside className="col-span-12 lg:col-span-4">
              <div className="space-y-4">
                <SideCardSkeleton rows={2} />
              </div>
            </aside>
            <aside className="col-span-12 lg:col-span-8 lg:col-start-5">
              <div className="space-y-4">
                <SideCardSkeleton rows={4} />
              </div>
            </aside>
          </div>

          <div className="mt-6 space-y-6">
            <RelationshipTableSkeleton />
            <RelationshipTableSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}
