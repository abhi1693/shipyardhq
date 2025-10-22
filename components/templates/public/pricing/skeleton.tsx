import { Skeleton } from "@/components/atoms/skeleton"

export function PricingPageSkeleton() {
  return (
    <main className="relative isolate overflow-hidden bg-white">
      <section className="h-[420px] w-full border-b border-border/40 bg-muted/30" />
      <div className="mx-auto max-w-[84rem] px-4 py-16 md:px-8">
        <div className="space-y-12">
          <Skeleton className="h-[420px] rounded-3xl" />
          <Skeleton className="h-[360px] rounded-3xl" />
          <Skeleton className="h-[420px] rounded-3xl" />
          <Skeleton className="h-[380px] rounded-3xl" />
        </div>
      </div>
    </main>
  )
}
