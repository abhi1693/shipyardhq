import { Metadata } from "next"
export const revalidate = 60
import Link from "next/link"
import {
  getCategories,
  getUseCasesWithCounts,
} from "@/actions/admin/categories/actions"
import { getBrowseProducts } from "@/actions/public/browse/actions"
import { EmptyState } from "@/components/molecules/empty-state"
import ProductGridClient from "@/components/molecules/ProductGridClient"
import BrowseFilterBar from "@/components/molecules/BrowseFilterBar"
import PublicContainer from "@/components/layout/PublicContainer"
import { PageHeader } from "@/components/molecules/PageHeader"
import { pluralize } from "@/lib/pluralize"
import { getProducts } from "@/actions/public/products/featured"
import { BrowseFeaturedCarousel } from "@/components/organisms/BrowseFeaturedCarousel"

export const metadata: Metadata = {
  title: "Browse Products",
  description:
    "Chart your course through tools, startups, and products by use case or category",
}

type StrOrArr = string | string[] | undefined
interface BrowseSearchParams {
  useCase?: StrOrArr
  category?: StrOrArr
  verified?: StrOrArr
  sort?: StrOrArr
  page?: StrOrArr
  q?: StrOrArr
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<BrowseSearchParams>
}) {
  const params = await searchParams
  const pick = (v: StrOrArr) => (Array.isArray(v) ? v[0] : v)
  const useCase = pick(params.useCase)
  const category = pick(params.category)
  const verified = pick(params.verified)
  const sort =
    (pick(params.sort) as "new" | "trending" | "votes" | "az") ?? "new"
  const page = pick(params.page) ?? "1"
  const q = pick(params.q)

  const [browseResult, featured, useCases, categories] = await Promise.all([
    getBrowseProducts({
      useCaseSlug: useCase === "__all__" ? undefined : useCase,
      categorySlug: category === "__all__" ? undefined : category,
      verified: verified === "true",
      sort,
      page: parseInt(page),
      query: q?.trim() || undefined,
    }),
    getProducts("featured"),
    getUseCasesWithCounts(),
    getCategories({
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const { products, hasMore } = browseResult

  // URL building handled in client components; removed local duplication.

  const sortLabelMap: Record<string, string> = {
    new: "Newest",
    trending: "Trending",
    votes: "Most Upvoted",
    az: "A–Z",
  }

  return (
    <PublicContainer max="7xl" paddingY="py-12" innerClassName="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Chart your course through top startups."
          subtitle="Explore a curated fleet of SaaS tools, micro‑SaaS solutions, and indie projects built by makers."
          underline
          meta={
            <>
              Showing {products.length} {pluralize(products.length, "result")}
              {" • "}Sort: {sortLabelMap[sort] ?? "Newest"}
            </>
          }
          className="flex-1"
        />
        <BrowseFeaturedCarousel
          products={featured}
          className="lg:max-w-sm"
        />
      </div>

      <BrowseFilterBar
        useCases={useCases}
        categories={categories}
        current={{ useCase, category, sort, verified: verified === "true" }}
      />

      {products.length === 0 ? (
        <div>
          <EmptyState
            title="No results in sight"
            description="Explore categories or adjust filters to spot what you need."
            actionLabel="Reset Filters"
            actionHref="/browse"
          />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/browse?sort=trending"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.35] bg-background/85 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--brand-1)] shadow-[0_18px_45px_-30px_rgba(7,58,104,0.6)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--brand-1)/0.5] hover:bg-[linear-gradient(120deg,rgba(59,130,246,0.18),rgba(14,165,233,0.12))]"
            >
              Try Trending
            </Link>
            <Link
              href="/browse?verified=true"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.35] bg-background/85 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--brand-1)] shadow-[0_18px_45px_-30px_rgba(7,58,104,0.6)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--brand-1)/0.5] hover:bg-[linear-gradient(120deg,rgba(59,130,246,0.18),rgba(14,165,233,0.12))]"
            >
              Verified Only
            </Link>
          </div>
        </div>
      ) : (
        <ProductGridClient
          initialProducts={products}
          initialHasMore={hasMore}
          initialPage={2}
          searchParams={{
            useCase: useCase === "__all__" ? undefined : useCase,
            category: category === "__all__" ? undefined : category,
            verified: verified === "true",
            sort,
            q: q?.trim() || undefined,
          }}
        />
      )}
    </PublicContainer>
  )
}
