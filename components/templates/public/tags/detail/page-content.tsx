import { notFound } from "next/navigation"

import { EmptyState } from "@/components/molecules/empty-state"
import KeywordTagCloud from "@/components/molecules/KeywordTagCloud"
import { getTagDetailPayload } from "@/lib/tags/page-cache"
import { formatTagLabel } from "@/app/(public)/tags/_utils"
import TagProductsClient from "@/app/(public)/tags/[slug]/TagProductsClient"

interface TagPageProps {
  params: Promise<{ slug: string }>
}

export async function TagDetailPageContent({ params }: TagPageProps) {
  const { slug } = await params

  const payload = await getTagDetailPayload(slug, 1)
  if (!payload) {
    notFound()
  }

  const { summary, products, summaries } = payload
  const navSummaries = [
    summary,
    ...summaries.filter((item) => item.slug !== summary.slug),
  ]
  const cloudItems = navSummaries.map((summary) => ({
    slug: summary.slug,
    label: formatTagLabel(summary.canonical || summary.keyword),
    count: summary.productCount,
    href: `/tags/${summary.slug}`,
  }))

  const total = products.total
  const activeLabel = formatTagLabel(summary.canonical || summary.keyword)

  return (
    <main className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
        <header className="space-y-3 pb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
            Tag Directory
          </p>
          <h1 className="text-4xl font-semibold text-slate-900">
            {activeLabel} launches
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            These products include the “{activeLabel}” keyword. Explore related
            tools or switch tags to explore adjacent themes.
          </p>
        </header>

        <div className="space-y-10">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-6 sm:px-6">
            <header className="mb-4 space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Explore related tags
              </h2>
              <p className="text-sm text-slate-600">
                Jump to other high-signal keywords from this product cluster.
              </p>
            </header>
            <KeywordTagCloud
              items={cloudItems}
              activeSlug={summary.slug}
              className="pt-2"
            />
          </section>

          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-slate-900">
                  {activeLabel}
                </h2>
                <p className="text-sm text-slate-600">
                  {total} product{total === 1 ? "" : "s"} tagged with this
                  keyword.
                </p>
              </div>
            </div>

            {products.products.length > 0 ? (
              <TagProductsClient
                slug={summary.slug}
                initialItems={products.products}
                initialHasMore={products.hasMore}
                initialPage={2}
                total={total}
              />
            ) : (
              <EmptyState
                title="No products yet"
                description="Products will appear here once they use this keyword."
              />
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
