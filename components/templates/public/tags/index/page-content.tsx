import Link from "next/link"

import { EmptyState } from "@/components/molecules/empty-state"
import KeywordTagCloud from "@/components/molecules/KeywordTagCloud"
import { getTagsIndexPayload } from "@/lib/tags/page-cache"

import { formatTagLabel } from "@/app/(public)/tags/_utils"
import TagProductsClient from "@/app/(public)/tags/[slug]/TagProductsClient"

type TagsSearchParams = {
  page?: string | string[]
}

export async function TagsIndexPageContent({
  searchParams,
}: {
  searchParams: Promise<TagsSearchParams>
}) {
  await searchParams

  const payload = await getTagsIndexPayload(1)
  const { summaries, activeSummary, activeProducts } = payload

  if (!summaries.length || !activeSummary) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 py-20 text-center">
        <EmptyState
          title="No tags yet"
          description="Once products add keywords, you’ll be able to explore them here."
        />
      </div>
    )
  }

  const cloudItems = summaries.map((summary) => ({
    slug: summary.slug,
    label: formatTagLabel(summary.canonical || summary.keyword),
    count: summary.productCount,
    href: `/tags/${summary.slug}`,
  }))
  const tagData = activeProducts

  const total = tagData?.total ?? activeSummary.productCount

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-6 sm:px-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Top tags</h2>
            <p className="text-sm text-slate-600">
              Spotlighting the {cloudItems.length} most-used keywords across
              published products.
            </p>
          </div>
          <Link
            href="/browse"
            className="text-sm font-medium text-sky-600 transition hover:text-sky-700"
          >
            Browse all products
          </Link>
        </header>
        <KeywordTagCloud
          items={cloudItems}
          activeSlug={activeSummary.slug}
          className="pt-2"
        />
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-slate-900">
              {formatTagLabel(
                tagData?.summary.canonical || activeSummary.canonical,
              )}
            </h2>
            <p className="text-sm text-slate-600">
              {total} product{total === 1 ? "" : "s"} tagged with this keyword.
            </p>
          </div>
        </div>

        {tagData && tagData.products.length > 0 ? (
          <TagProductsClient
            slug={tagData.summary.slug}
            initialItems={tagData.products}
            initialHasMore={tagData.hasMore}
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
  )
}
