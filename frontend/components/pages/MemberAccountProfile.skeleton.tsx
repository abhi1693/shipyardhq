import { Skeleton } from "@/components/atoms/skeleton"

export function MemberAccountProfileSkeleton() {
  return (
    <div
      className="p-2 sm:p-4"
      data-slot="member-account-profile-skeleton"
      aria-hidden="true"
    >
      <Skeleton
        tone="soft"
        radius="lg"
        border="muted"
        inset
        className="h-[520px] max-h-[70vh] min-h-[360px] w-full rounded-lg"
      >
        <div className="flex h-full flex-col justify-between gap-4 p-4">
          <div className="space-y-4">
            <Skeleton className="h-4 w-40 rounded-full" tone="muted" />
            <Skeleton className="h-3 w-64 rounded-full" tone="muted" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-md" tone="soft" />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Skeleton className="h-9 w-28 rounded-full" tone="soft" />
            <Skeleton className="h-9 w-32 rounded-full" tone="soft" />
          </div>
        </div>
      </Skeleton>
    </div>
  )
}
