import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

interface ConfirmationCardSkeletonProps {
  /**
   * Number of supporting text lines beneath the title.
   */
  descriptionLines?: number
  /**
   * Variant to approximate for the primary button.
   */
  buttonVariant?: "default" | "destructive"
  /**
   * Optional width override for the primary button label.
   */
  buttonLabelWidth?: number | string
}

export function ConfirmationCardSkeleton({
  descriptionLines = 2,
  buttonVariant = "destructive",
  buttonLabelWidth,
}: ConfirmationCardSkeletonProps) {
  const lines = Math.max(1, descriptionLines)

  return (
    <div
      className="mx-auto w-full max-w-xl"
      data-slot="confirmation-card-skeleton"
      aria-hidden="true"
    >
      <Skeleton
        tone="soft"
        border="muted"
        radius="lg"
        inset
        className="space-y-6 p-6 shadow-sm"
      >
        <div className="space-y-2">
          <HeadingSkeleton lines={1} />
        </div>
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, index) => (
            <Skeleton
               
              key={index}
              className="h-2.5 w-full rounded-full"
              tone="muted"
              shimmer={false}
            />
          ))}
        </div>
        <div className="flex justify-end border-t border-white/10 pt-4">
          <ButtonSkeleton
            variant={buttonVariant}
            labelWidth={buttonLabelWidth ?? "8rem"}
          />
        </div>
      </Skeleton>
    </div>
  )
}
