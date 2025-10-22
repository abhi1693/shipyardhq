import { BadgeSkeleton } from "@/components/atoms/badge.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { TableSkeleton } from "@/components/atoms/table.skeleton"

export function MemberProductDetailSkeleton() {
  return (
    <div
      className="space-y-8 py-10"
      data-slot="member-product-detail-skeleton"
      aria-hidden="true"
    >
      <Skeleton
        tone="soft"
        radius="lg"
        border="muted"
        inset
        className="space-y-6 rounded-3xl border-[color:var(--brand-1)/0.08] bg-white/85 px-6 py-8 shadow-[0_24px_56px_-36px_rgba(7,78,134,0.55)] backdrop-blur sm:px-8"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <BadgeSkeleton variant="outline" className="h-7 w-32" />
            <div className="space-y-3">
              <HeadingSkeleton lines={1} />
              <Skeleton
                className="h-3 w-80 max-w-full rounded-full"
                tone="muted"
                shimmer={false}
              />
              <Skeleton
                className="h-3 w-96 max-w-full rounded-full"
                tone="muted"
                shimmer={false}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  // eslint-disable-next-line react/no-array-index-key -- decorative
                  key={index}
                  className="h-7 w-28 rounded-full"
                  tone="soft"
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <ButtonSkeleton size="sm" labelWidth="7.5rem" />
            <ButtonSkeleton size="sm" variant="outline" labelWidth="8rem" />
            <ButtonSkeleton size="sm" variant="outline" labelWidth="9rem" />
            <ButtonSkeleton size="sm" labelWidth="7rem" />
            <ButtonSkeleton size="sm" variant="outline" labelWidth="6rem" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              // eslint-disable-next-line react/no-array-index-key -- decorative
              key={index}
              className="h-6 w-24 rounded-full border border-white/30"
              tone="soft"
            />
          ))}
        </div>
      </Skeleton>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key -- decorative
                key={index}
                className="space-y-2 rounded-xl border border-white/40 p-4"
              >
                <Skeleton className="h-2.5 w-24 rounded-full" tone="muted" />
                <Skeleton className="h-3 w-32 rounded-full" tone="muted" />
              </div>
            ))}
          </div>
        </Skeleton>

        <Skeleton
          tone="soft"
          radius="lg"
          border="muted"
          inset
          className="space-y-4 p-6"
        >
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-full" tone="muted" />
            <Skeleton className="h-2.5 w-40 rounded-full" tone="muted" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                // eslint-disable-next-line react/no-array-index-key -- decorative
                key={index}
                className="h-12 rounded-lg border border-white/30"
                tone="soft"
              />
            ))}
          </div>
        </Skeleton>
      </div>

      <CardSkeleton lines={6} showFooter tone="soft" />

      <Skeleton
        tone="soft"
        radius="lg"
        border="muted"
        inset
        className="space-y-6 p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-48 rounded-full" tone="muted" />
            <Skeleton className="h-2.5 w-72 rounded-full" tone="muted" />
          </div>
          <ButtonSkeleton size="sm" labelWidth="8rem" />
        </div>
        <TableSkeleton columns={4} rows={5} showHeader dense />
      </Skeleton>
    </div>
  )
}
