import Link from "next/link"
import { notFound } from "next/navigation"
import { Metadata } from "next"

import {
  getKeywordTagBySlug,
  TAG_PRODUCTS_PAGE_SIZE,
} from "@/actions/public/tags/actions"
import ProductCompactGrid from "@/components/molecules/ProductCompactGrid"
import { EmptyState } from "@/components/molecules/empty-state"
import KeywordTagCloud from "@/components/molecules/KeywordTagCloud"
import { buildPageMetadata } from "@/lib/metadata"
import { resolvePagination } from "@/lib/pagination"
import { cn } from "@/lib/utils"

import { buildPageHref, formatTagLabel } from "../_utils"
import { getTagDetailPayload } from "@/lib/tags/page-cache"

interface TagPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string | string[] }>
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { slug } = await params
  const summary = await getKeywordTagBySlug(slug)
  if (!summary) return {}

  const label = formatTagLabel(summary.canonical || summary.keyword)
  return buildPageMetadata({
    title: `${label} Tag`,
    description: `Discover Shipyard products tagged with “${label}”. Browse the latest launches and tools connected to this keyword.`,
    section: "Tags",
  })
}

export default async function TagDetailPage({
  params,
  searchParams,
}: TagPageProps) {
  const [{ slug }, resolvedSearch] = await Promise.all([params, searchParams])
  const pagination = resolvePagination(resolvedSearch, {
    defaultPage: 1,
    defaultPageSize: TAG_PRODUCTS_PAGE_SIZE,
    maxPageSize: TAG_PRODUCTS_PAGE_SIZE,
  })

  const payload = await getTagDetailPayload(slug, pagination.page)
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
  const totalPages = Math.max(1, Math.ceil(total / TAG_PRODUCTS_PAGE_SIZE))
  const basePath = `/tags/${summary.slug}`
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
              <div className="text-sm text-slate-500">
                Page {pagination.page} of {totalPages}
              </div>
            </div>

            {products.products.length > 0 ? (
              <ProductCompactGrid
                items={products.products}
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
