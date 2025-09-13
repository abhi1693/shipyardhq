import { Metadata } from "next"
export const dynamic = "force-dynamic"
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
import AsideFeatured from "@/components/organisms/AsideFeatured"

export const metadata: Metadata = {
  title: "Browse Products",
  description: "Discover tools, startups, and products by use case or category",
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
  const featured = await getProducts("featured")
  const useCases = await getUseCasesWithCounts()
  const categories = await getCategories({
    include: { _count: { select: { products: true } } },
    orderBy: { createdAt: "desc" },
  })

  const params = await searchParams
  const pick = (v: StrOrArr) => (Array.isArray(v) ? v[0] : v)
  const useCase = pick(params.useCase)
  const category = pick(params.category)
  const verified = pick(params.verified)
  const sort =
    (pick(params.sort) as "new" | "trending" | "votes" | "az") ?? "new"
  const page = pick(params.page) ?? "1"
  const q = pick(params.q)

  const { products, hasMore } = await getBrowseProducts({
    useCaseSlug: useCase === "__all__" ? undefined : useCase,
    categorySlug: category === "__all__" ? undefined : category,
    verified: verified === "true",
    sort,
    page: parseInt(page),
    query: q?.trim() || undefined,
  })

  // URL building handled in client components; removed local duplication.

  const sortLabelMap: Record<string, string> = {
    new: "Newest",
    trending: "Trending",
    votes: "Most Upvoted",
    az: "A–Z",
  }

  return (
    <PublicContainer max="7xl" paddingY="py-12" innerClassName="space-y-6">
      <PageHeader
        title="Discover the best startups."
        subtitle="Browse through a curated collection of SaaS tools, micro-SaaS solutions, and indie side projects built by hackers and makers."
        underline
        meta={
          <>
            Showing {products.length} {pluralize(products.length, "result")}
            {" • "}Sort: {sortLabelMap[sort] ?? "Newest"}
          </>
        }
      />

      <div>
        <BrowseFilterBar
          useCases={useCases}
          categories={categories}
          current={{ useCase, category, sort, verified: verified === "true" }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          {products.length === 0 ? (
            <div>
              <EmptyState
                title="Nothing Found"
                description="Explore our categories or use cases to find products that suit your needs."
                actionLabel="Reset Filters"
                actionHref="/browse"
              />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="/browse?sort=trending"
                  className="inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"
                >
                  Try Trending
                </Link>
                <Link
                  href="/browse?verified=true"
                  className="inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"
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
        </div>
        <div className="hidden lg:block">
          <AsideFeatured products={featured.slice(0, 6)} />
        </div>
      </div>
    </PublicContainer>
  )
}
