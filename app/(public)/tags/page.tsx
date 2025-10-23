import { type ReactNode, Suspense } from "react"

import { TagsIndexPageContent } from "@/components/templates/public/tags/index/page-content"
import { buildPageMetadata } from "@/lib/metadata"

export const metadata = buildPageMetadata({
  title: "Browse Tags",
  description:
    "Explore Shipyard products by their top keywords and discover new tools aligned with your interests.",
})

export default function TagsIndexPage(
  props: Parameters<typeof TagsIndexPageContent>[0],
) {
  return (
    <TagsShell>
      <Suspense fallback={<TagSectionsSkeleton />}>
        <TagsIndexPageContent {...props} />
      </Suspense>
    </TagsShell>
  )
}

function TagsShell({ children }: { children: ReactNode }) {
  return (
    <main className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
        <header className="space-y-3 pb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
            Tag Directory
          </p>
          <h1 className="text-4xl font-semibold text-slate-900">
            Explore product tags
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Shipyard keywords double as tags. Browse the most popular themes and
            discover new products linked to each topic.
          </p>
        </header>

        {children}
      </div>
    </main>
  )
}

function TagSectionsSkeleton() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-2">
            <div className="h-4 w-28 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-3 w-64 rounded-full bg-slate-200/80 animate-pulse" />
          </div>
          <div className="h-8 w-32 rounded-full bg-slate-100 animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          {Array.from({ length: 14 }).map((_, index) => (
            <div
              // eslint-disable-next-line react/no-array-index-key -- decorative
              key={index}
              className="h-9 w-24 rounded-full bg-slate-200/70 animate-pulse"
            />
          ))}
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <div className="h-5 w-44 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-3 w-40 rounded-full bg-slate-200/70 animate-pulse" />
          </div>
          <div className="h-3 w-28 rounded-full bg-slate-200/70 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              // eslint-disable-next-line react/no-array-index-key -- decorative
              key={index}
              className="h-48 rounded-3xl border border-slate-200 bg-slate-100/60 animate-pulse"
            />
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
          <div className="h-9 w-24 rounded-full bg-slate-200/80 animate-pulse" />
          <div className="h-9 w-20 rounded-full bg-slate-200/80 animate-pulse" />
        </div>
      </section>
    </div>
  )
}
