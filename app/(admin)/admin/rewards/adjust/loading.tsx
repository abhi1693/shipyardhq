import { Skeleton } from "@/components/atoms/skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { FormSkeleton } from "@/components/atoms/form.skeleton"

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl" aria-hidden="true">
      <Skeleton
        tone="soft"
        radius="lg"
        shimmer={false}
        inset
        className="space-y-6 border border-white/30 p-6"
      >
        <HeadingSkeleton lines={2} />
        <FormSkeleton
          fields={[{ type: "select" }, { type: "input" }, { type: "textarea" }]}
          actions={1}
          columns={1}
          className="border border-white/20 bg-white/95"
        />
      </Skeleton>
    </div>
  )
}
