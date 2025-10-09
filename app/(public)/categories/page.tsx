import Link from "next/link"

import { getCategoriesWithCounts } from "@/actions/public/categories/actions"
import { Button } from "@/components/atoms/button"
import { CategoryCard } from "@/components/molecules/CategoryCard"
import { buildPageMetadata } from "@/lib/metadata"
import { pluralize } from "@/lib/pluralize"
import { BROWSE_PATH, MEMBER_PRODUCTS_PATH, categoryPath } from "@/lib/routes"

export const metadata = buildPageMetadata({
  title: "Categories",
  description: "Browse Shipyard by category and discover innovative products.",
})

type CategoryListItem = Awaited<
  ReturnType<typeof getCategoriesWithCounts>
>[number]

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts()
  const totalProducts = categories.reduce(
    (sum: number, cat: CategoryListItem) => sum + (cat.count ?? 0),
    0,
  )
  const averagePerCategory =
    categories.length > 0
      ? Math.max(1, Math.round(totalProducts / categories.length))
      : 0
  const highlightCategories = categories.slice(0, 4)
  const busiestCategory = categories[0]

  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="space-y-16">
          <section className="rounded-3xl border border-border bg-white px-6 py-12 shadow-sm md:px-10">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                  Category directory
                </span>
                <div className="space-y-4">
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    Discover categories built for every launch
                  </h1>
                  <p className="text-base text-muted-foreground">
                    See the full taxonomy of Shipyard launches, spot niche
                    segments gaining momentum, and jump into the categories that
                    match your product story.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <Button
                    size="lg"
                    asChild
                    className="shadow-sm shadow-black/10"
                  >
                    <Link href={BROWSE_PATH}>Browse every launch</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="border-border text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground"
                  >
                    <Link href={MEMBER_PRODUCTS_PATH}>
                      Submit your category launch
                    </Link>
                  </Button>
                </div>
                {highlightCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {highlightCategories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={categoryPath(cat.slug)}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                      >
                        <span className="truncate">{cat.name}</span>
                        {typeof cat.count === "number" ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {cat.count.toLocaleString()}
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Active categories
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {categories.length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pluralize(categories.length, "category")} leading the
                    directory.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Launches cataloged
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {totalProducts.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pluralize(totalProducts, "product")} tracked across
                    Shipyard.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Momentum snapshot
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-foreground">
                    {averagePerCategory.toLocaleString()} avg / category
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {busiestCategory
                      ? `${busiestCategory.count?.toLocaleString() ?? 0} launches currently live in ${busiestCategory.name}.`
                      : "Keep an eye out for the next launches to go live."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-white px-6 py-10 shadow-sm md:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  Explore every category
                </h2>
                <p className="text-sm text-muted-foreground">
                  {pluralize(categories.length, "category")} organized by
                  traction, narrative, and community demand.
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                {totalProducts.toLocaleString()} launches cataloged
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((cat: CategoryListItem) => (
                <CategoryCard
                  key={cat.id}
                  href={categoryPath(cat.slug)}
                  name={cat.name}
                  icon={cat.icon}
                  description={cat.description}
                  count={cat.count}
                />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card/95 px-6 py-12 shadow-[0_24px_80px_-50px_rgba(7,58,104,0.5)] backdrop-blur md:px-10">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                Help shape new categories
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Missing a category for your launch?
              </h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Pitch a new category and we’ll create a dedicated lane, signal
                it to the community, and feature the first builders ready to
                launch.
              </p>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="border-border/70"
              >
                <a href="mailto:support@shipyardhq.dev">
                  Suggest a new category
                </a>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
