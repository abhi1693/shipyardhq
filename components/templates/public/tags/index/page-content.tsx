import Link from "next/link"

import ProductCompactGrid from "@/components/molecules/ProductCompactGrid"
import { EmptyState } from "@/components/molecules/empty-state"
import KeywordTagCloud from "@/components/molecules/KeywordTagCloud"
import { buildPageMetadata } from "@/lib/metadata"
import { resolvePagination } from "@/lib/pagination"
import { cn } from "@/lib/utils"
import { getTagsIndexPayload } from "@/lib/tags/page-cache"
import { TAG_PRODUCTS_PAGE_SIZE } from "@/actions/public/tags/actions"

import { buildPageHref, formatTagLabel } from "@/app/(public)/tags/_utils"

export const revalidate = 300

export const metadata = buildPageMetadata({
  title: "Browse Tags",
  description:
    "Explore Shipyard products by their top keywords and discover new tools aligned with your interests.",
})

type TagsSearchParams = {
  page?: string | string[]
}

export async function TagsIndexPageContent({
  searchParams,
}: {
  searchParams: Promise<TagsSearchParams>
}) {
  const resolvedParams = await searchParams
  const pagination = resolvePagination(resolvedParams, {
    defaultPage: 1,
    defaultPageSize: TAG_PRODUCTS_PAGE_SIZE,
    maxPageSize: TAG_PRODUCTS_PAGE_SIZE,
  })

  const payload = await getTagsIndexPayload(pagination.page)
  const { summaries, activeSummary, activeProducts } = payload

  if (!summaries.length || !activeSummary) {
    return (
      <main className="bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 py-20 text-center">
          <EmptyState
            title="No tags yet"
            description="Once products add keywords, you’ll be able to explore them here."
          />
        </div>
      </main>
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
  const totalPages = Math.max(1, Math.ceil(total / TAG_PRODUCTS_PAGE_SIZE))
  const basePath = "/tags"

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

        <div className="space-y-10">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-6 sm:px-6">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  Top tags
                </h2>
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
                  {total} product{total === 1 ? "" : "s"} tagged with this
                  keyword.
                </p>
              </div>
              <div className="text-sm text-slate-500">
                Page {pagination.page} of {totalPages}
              </div>
            </div>

            {tagData && tagData.products.length > 0 ? (
              <ProductCompactGrid
                items={tagData.products}
                columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              />
            ) : (
              <EmptyState
                title="No products yet"
                description="Products will appear here once they use this keyword."
              />
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-6 text-sm text-slate-600">
                <Link
                  href={buildPageHref(
                    basePath,
                    Math.max(1, pagination.page - 1),
                  )}
                  aria-disabled={pagination.page === 1}
                  className={cn(
                    "rounded-full px-3 py-1.5 font-medium transition",
                    pagination.page === 1
                      ? "cursor-not-allowed text-slate-300"
                      : "hover:bg-slate-100",
                  )}
                >
                  Previous
                </Link>
                <Link
                  href={buildPageHref(
                    basePath,
                    Math.min(totalPages, pagination.page + 1),
                  )}
                  aria-disabled={pagination.page >= totalPages}
                  className={cn(
                    "rounded-full px-3 py-1.5 font-medium transition",
                    pagination.page >= totalPages
                      ? "cursor-not-allowed text-slate-300"
                      : "hover:bg-slate-100",
                  )}
                >
                  Next
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
