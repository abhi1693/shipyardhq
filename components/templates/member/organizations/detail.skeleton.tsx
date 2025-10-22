import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { TableSkeleton } from "@/components/atoms/table.skeleton"

export function MemberOrganizationDetailSkeleton() {
  return (
    <div
      className="space-y-8 py-10"
      data-slot="member-organization-detail-skeleton"
      aria-hidden="true"
    >
      <Skeleton
        tone="soft"
        radius="lg"
        border="muted"
        inset
        className="flex flex-col gap-6 rounded-3xl border-[color:var(--brand-1)/0.08] bg-white/80 px-6 py-8 shadow-[0_24px_56px_-40px_rgba(7,78,134,0.45)] backdrop-blur sm:px-8 md:flex-row md:items-start md:justify-between"
      >
        <div className="space-y-4">
          <BadgeSkeleton variant="outline" className="h-7 w-28" />
          <div className="space-y-3">
            <HeadingSkeleton lines={1} />
            <Skeleton
              className="h-3 w-72 max-w-full rounded-full"
              tone="muted"
              shimmer={false}
            />
            <Skeleton
              className="h-3 w-80 max-w-full rounded-full"
              tone="muted"
              shimmer={false}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                // eslint-disable-next-line react/no-array-index-key -- decorative
                key={index}
                className="h-7 w-28 rounded-full"
                tone="soft"
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2 md:justify-end">
          <ButtonSkeleton size="sm" labelWidth="6.5rem" />
          <ButtonSkeleton size="sm" variant="outline" labelWidth="6.5rem" />
          <ButtonSkeleton size="sm" variant="secondary" labelWidth="7.5rem" />
        </div>
      </Skeleton>

      <div className="grid gap-6 lg:grid-cols-3">
        <CardSkeleton
          className="lg:col-span-2"
          lines={6}
          showFooter={false}
          tone="soft"
        />
        <CardSkeleton lines={4} showFooter={false} tone="soft" />
      </div>

      <Skeleton
        tone="soft"
        radius="lg"
        border="muted"
        inset
        className="space-y-5 p-6"
      >
        <div className="space-y-2">
          <Skeleton className="h-3 w-40 rounded-full" tone="muted" />
          <Skeleton className="h-2.5 w-72 rounded-full" tone="muted" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Skeleton
            className="h-24 rounded-xl border border-dashed border-white/40"
            tone="soft"
          />
          <Skeleton
            className="h-24 rounded-xl border border-dashed border-white/40"
            tone="soft"
          />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              // eslint-disable-next-line react/no-array-index-key -- decorative
              key={index}
              className="h-14 rounded-xl border border-white/30"
              tone="soft"
            />
          ))}
        </div>
      </Skeleton>

      <Skeleton
        tone="soft"
        radius="lg"
        border="muted"
        inset
        className="space-y-6 p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-40 rounded-full" tone="muted" />
            <Skeleton className="h-2.5 w-64 rounded-full" tone="muted" />
          </div>
          <ButtonSkeleton size="sm" labelWidth="7rem" />
        </div>
        <TableSkeleton columns={3} rows={4} showHeader dense />
      </Skeleton>
    </div>
  )
}
