import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"
import { FormSkeleton } from "@/components/atoms/form.skeleton"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"

export function EditProductFormSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6"
      data-slot="edit-product-form-skeleton"
      aria-hidden="true"
    >
      <Skeleton
        tone="soft"
        radius="lg"
        border="muted"
        inset
        className="p-6 shadow-sm"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <HeadingSkeleton lines={1} />
            <Skeleton
              className="h-2.5 w-1/2 rounded-full"
              tone="muted"
              shimmer={false}
            />
          </div>

          <Skeleton
            tone="soft"
            radius="lg"
            border="muted"
            inset
            className="p-0 shadow-none"
          >
            <div className="divide-y divide-border/60">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <Skeleton
                      className="h-3 w-44 rounded-full"
                      tone="muted"
                      shimmer={false}
                    />
                    <Skeleton
                      className="h-5 w-24 rounded-full"
                      tone="muted"
                      shimmer={false}
                    />
                  </div>
                  {i === 0 ? (
                    <div className="pt-5">
                      <FormSkeleton
                        columns={2}
                        showTitle={false}
                        actions={0}
                        fields={[
                          { type: "input" },
                          { type: "input" },
                          { type: "textarea", columns: 2 },
                          { type: "select" },
                          { type: "select" },
                        ]}
                        className="border-0 bg-transparent p-0 shadow-none"
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Skeleton>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-4">
            <ButtonSkeleton variant="outline" size="sm" labelWidth="6rem" />
            <ButtonSkeleton variant="default" size="sm" labelWidth="6.5rem" />
          </div>
        </div>
      </Skeleton>
    </div>
  )
}
