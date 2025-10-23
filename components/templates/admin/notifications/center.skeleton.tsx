import { Skeleton } from "@/components/atoms/skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { FormSkeleton } from "@/components/atoms/form.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { cn } from "@/lib/utils"

type AdminNotificationCenterSkeletonProps = React.ComponentProps<"div">

export function AdminNotificationCenterSkeleton({
  className,
  ...props
}: AdminNotificationCenterSkeletonProps) {
  return (
    <div
      className={cn("space-y-8", className)}
      data-slot="admin-notification-center-skeleton"
      aria-hidden="true"
      {...props}
    >
      <div className="space-y-3">
        <HeadingSkeleton lines={2} />
        <Skeleton
          className="h-2.5 w-3/4 rounded-full"
          tone="muted"
          shimmer={false}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_2fr_1.5fr]">
        <Skeleton
          tone="soft"
          radius="lg"
          shimmer={false}
          inset
          className="space-y-4 border border-white/25 p-5"
        >
          <Skeleton className="h-2.5 w-32 rounded-full" tone="muted" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                // eslint-disable-next-line react/no-array-index-key -- decorative
                key={index}
                className="space-y-2 rounded-xl border border-white/25 px-4 py-3"
                tone="soft"
              >
                <Skeleton
                  className="h-2.5 w-40 rounded-full"
                  tone="muted"
                  shimmer={false}
                />
                <Skeleton className="h-2 w-32 rounded-full" tone="muted" />
              </Skeleton>
            ))}
          </div>
        </Skeleton>

        <Skeleton
          tone="soft"
          radius="lg"
          shimmer={false}
          inset
          className="space-y-5 border border-white/25 p-6"
        >
          <HeadingSkeleton lines={1} />
          <FormSkeleton
            fields={[
              { type: "select" },
              { type: "input" },
              { type: "textarea", columns: 2 },
              { type: "checkbox" },
            ]}
            actions={2}
            columns={1}
            className="border border-white/25 bg-white/95"
          />
        </Skeleton>

        <Skeleton
          tone="soft"
          radius="lg"
          shimmer={false}
          inset
          className="space-y-4 border border-white/25 p-5"
        >
          <HeadingSkeleton lines={1} />
          <CardSkeleton lines={5} showHeader={false} />
          <ButtonSkeleton size="sm" labelWidth="6rem" />
        </Skeleton>
      </div>
    </div>
  )
}
