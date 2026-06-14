import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

export function EditProductFormSkeleton() {
  return (
    <section
      className="w-full space-y-6"
      data-slot="edit-product-form-skeleton"
      aria-hidden="true"
    >
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Skeleton className="h-10 w-44 rounded-lg" tone="soft" />
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <div className="flex min-w-[760px] items-center px-4 py-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex flex-1 items-center">
                <div className="flex min-w-0 items-center gap-2 rounded-lg px-3 py-2">
                  <Skeleton
                    className="size-6 rounded"
                    tone={index === 0 ? "brand" : "soft"}
                  />
                  <Skeleton className="h-3 w-24 rounded-full" tone="muted" />
                </div>
                {index < 4 ? (
                  <div className="mx-2 h-px flex-1 bg-[#E2E8F0]" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="h-1 bg-[#eff4ff]">
          <div className="h-full w-1/5 bg-[#0051d5]" />
        </div>
      </div>

      <div className="product-edit-step-content">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="mb-6 space-y-2">
            <Skeleton className="h-6 w-56 rounded-full" tone="soft" />
            <Skeleton
              className="h-4 w-96 max-w-full rounded-full"
              tone="muted"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-11 rounded-lg" tone="muted" />
            <Skeleton className="h-11 rounded-lg" tone="muted" />
            <Skeleton className="h-28 rounded-lg md:col-span-2" tone="muted" />
            <Skeleton className="h-11 rounded-lg" tone="muted" />
            <Skeleton className="h-11 rounded-lg" tone="muted" />
          </div>
        </div>
      </div>

      <footer className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-6 md:flex-row md:items-center md:justify-between">
        <ButtonSkeleton variant="outline" labelWidth="6rem" />
        <ButtonSkeleton labelWidth="12rem" />
      </footer>
    </section>
  )
}
