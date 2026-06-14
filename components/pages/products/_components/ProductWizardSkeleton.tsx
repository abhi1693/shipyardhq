"use client"

import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

function PhaseSkeleton({ active = false }: { active?: boolean }) {
  return (
    <div
      className={[
        "flex min-h-[112px] flex-col items-start gap-3 bg-white p-4",
        active ? "bg-blue-50/70" : "",
      ].join(" ")}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <Skeleton
          className="h-9 w-9 rounded-lg"
          tone={active ? "brand" : "soft"}
        />
        <Skeleton className="h-4 w-4 rounded" tone="muted" />
      </div>
      <div className="w-full space-y-2">
        <Skeleton
          className="h-3 w-24 rounded-full"
          tone={active ? "brand" : "muted"}
        />
        <Skeleton className="h-3 w-full rounded-full" tone="muted" />
        <Skeleton className="h-3 w-4/5 rounded-full" tone="muted" />
      </div>
    </div>
  )
}

function AccordionSectionSkeleton({
  open = false,
  recommended = false,
}: {
  open?: boolean
  recommended?: boolean
}) {
  return (
    <div className="px-6">
      <div className="-mx-6 flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-56 max-w-full rounded-full" tone="soft" />
          <Skeleton className="h-3 w-80 max-w-full rounded-full" tone="muted" />
        </div>
        <Skeleton
          className="h-6 w-24 rounded-full"
          tone={recommended ? "brand" : "soft"}
        />
      </div>

      {open ? (
        <div className="grid gap-4 py-6 md:grid-cols-2">
          <Skeleton className="h-11 rounded-lg" tone="muted" />
          <Skeleton className="h-11 rounded-lg" tone="muted" />
          <Skeleton className="h-28 rounded-lg md:col-span-2" tone="muted" />
          <Skeleton className="h-11 rounded-lg" tone="muted" />
          <Skeleton className="h-11 rounded-lg" tone="muted" />
        </div>
      ) : null}
    </div>
  )
}

export default function ProductWizardSkeleton() {
  return (
    <>
      <div
        className="relative mx-auto w-full max-w-[1040px] pb-28"
        aria-hidden="true"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 rounded-xl bg-[radial-gradient(rgba(0,81,213,0.07)_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl space-y-3">
              <Skeleton className="h-4 w-56 rounded-full" tone="muted" />
              <Skeleton
                className="h-9 w-80 max-w-full rounded-lg"
                tone="soft"
              />
              <Skeleton
                className="h-5 w-[38rem] max-w-full rounded-full"
                tone="muted"
              />
              <Skeleton
                className="h-5 w-[30rem] max-w-full rounded-full"
                tone="muted"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
            <div className="grid gap-px bg-slate-200 md:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <PhaseSkeleton key={index} active={index === 0} />
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-40 rounded-full" tone="muted" />
                <Skeleton className="h-4 w-32 rounded-full" tone="soft" />
              </div>
              <div className="flex min-w-[220px] items-center gap-3">
                <Skeleton className="h-2 flex-1 rounded-full" tone="muted" />
                <Skeleton className="h-3 w-8 rounded-full" tone="muted" />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur">
          <AccordionSectionSkeleton open />
          <AccordionSectionSkeleton />
          <AccordionSectionSkeleton />
          <AccordionSectionSkeleton recommended />
          <AccordionSectionSkeleton />
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.06)] backdrop-blur md:-mx-6 md:px-6">
        <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-56 rounded-full" tone="muted" />
          <ButtonSkeleton labelWidth="13rem" />
        </div>
      </div>
    </>
  )
}
