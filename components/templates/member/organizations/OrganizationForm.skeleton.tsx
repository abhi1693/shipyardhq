import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { InputSkeleton } from "@/components/atoms/input.skeleton"
import { LabelSkeleton } from "@/components/atoms/label.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

type OrganizationFormSkeletonVariant = "create" | "edit"

interface OrganizationFormSkeletonProps {
  variant?: OrganizationFormSkeletonVariant
}

export function OrganizationFormSkeleton({
  variant = "create",
}: OrganizationFormSkeletonProps) {
  const actionWidth = variant === "edit" ? "8rem" : "6.5rem"

  return (
    <div
      className="mx-auto w-full max-w-md"
      data-slot="organization-form-skeleton"
      aria-hidden="true"
    >
      <Skeleton
        tone="soft"
        radius="lg"
        border="muted"
        inset
        className="space-y-6 p-6 shadow-sm"
      >
        <HeadingSkeleton lines={1} />

        <div className="space-y-4">
          {[0, 1].map((index) => (
            <div
              // eslint-disable-next-line react/no-array-index-key -- decorative ordering
              key={index}
              className="space-y-2"
            >
              <LabelSkeleton />
              <InputSkeleton />
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-white/10 pt-4">
          <ButtonSkeleton labelWidth={actionWidth} />
        </div>
      </Skeleton>
    </div>
  )
}
