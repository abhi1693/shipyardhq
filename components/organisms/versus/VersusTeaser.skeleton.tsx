import * as React from "react"

import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { ProductCompactCardSkeleton } from "@/components/molecules/ProductCompactCard.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

export function VersusTeaserSkeleton({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={
        "rounded-3xl border border-border/70 bg-white px-6 py-6 shadow-[0_28px_90px_-70px_rgba(7,58,104,0.55)] md:px-8 md:py-8" +
        (className ? ` ${className}` : "")
      }
      data-slot="versus-teaser-skeleton"
      {...props}
    >
      <div className="space-y-3">
        <Skeleton className="h-2.5 w-48 rounded-full" tone="muted" />
        <HeadingSkeleton lines={2} centered={false} />
        <Skeleton className="h-3 w-4/5 rounded-full" tone="muted" />
      </div>
      <div className="relative mt-6 overflow-hidden rounded-[1.5rem] border border-border/60 bg-white/95 px-6 py-6 shadow-[0_28px_90px_-70px_rgba(7,58,104,0.45)] md:px-8 md:py-8">
        <div className="relative z-10 flex flex-col items-center gap-6 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch md:gap-8">
          <ProductCompactCardSkeleton showCategory withMeta />
          <div className="hidden h-full w-16 items-center justify-center md:flex">
            <Skeleton className="h-12 w-12 rounded-full" tone="brand" />
          </div>
          <div className="flex h-full w-full max-w-[24rem] flex-col justify-between gap-4 rounded-2xl border border-dashed border-border/60 bg-white/85 p-6 text-center shadow-[0_28px_80px_-68px_rgba(7,58,104,0.32)] md:mx-auto md:max-w-[24rem] md:justify-center md:text-left">
            <div className="space-y-2">
              <Skeleton className="h-3 w-40 rounded-full" tone="muted" />
              <Skeleton className="h-2.5 w-full rounded-full" tone="muted" />
              <Skeleton className="h-2.5 w-4/5 rounded-full" tone="muted" />
            </div>
            <ButtonSkeleton size="lg" labelWidth="9rem" />
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_16%_-20%,rgba(24,96,168,0.14),transparent_65%),radial-gradient(circle_at_88%_120%,rgba(155,93,229,0.18),transparent_70%)]"
        />
      </div>
    </section>
  )
}

export default VersusTeaserSkeleton
