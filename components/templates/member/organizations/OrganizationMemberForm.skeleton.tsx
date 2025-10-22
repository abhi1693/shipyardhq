import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { InputSkeleton } from "@/components/atoms/input.skeleton"
import { LabelSkeleton } from "@/components/atoms/label.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

interface OrganizationMemberFormSkeletonProps {
  actionLabelWidth?: number | string
}

export function OrganizationMemberFormSkeleton({
  actionLabelWidth = "7.5rem",
}: OrganizationMemberFormSkeletonProps) {
  return (
    <div
      className="mx-auto w-full max-w-md"
      data-slot="organization-member-form-skeleton"
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

        <div className="space-y-2">
          <LabelSkeleton />
          <InputSkeleton />
        </div>

        <div className="flex justify-end border-t border-white/10 pt-4">
          <ButtonSkeleton labelWidth={actionLabelWidth} />
        </div>
      </Skeleton>
    </div>
  )
}
