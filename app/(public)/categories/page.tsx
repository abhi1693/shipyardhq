import Link from "next/link"
import { getCategoriesWithCounts } from "@/actions/public/categories/actions"
import { CategoryCard } from "@/components/molecules/CategoryCard"
import PublicContainer from "@/components/layout/PublicContainer"
import { pluralize } from "@/lib/pluralize"
import { Button } from "@/components/atoms/button"
import { buildPageMetadata } from "@/lib/metadata"
import { BROWSE_PATH, MEMBER_PRODUCTS_PATH, categoryPath } from "@/lib/routes"

export const metadata = buildPageMetadata({
  title: "Categories",
  description:
    "Explore the harbor by category and discover innovative products.",
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

  return (
    <main className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(243,247,252,0.92)40%,rgba(233,243,251,0.9))] dark:bg-[linear-gradient(180deg,rgba(6,18,36,0.92),rgba(4,24,43,0.92)40%,rgba(9,32,55,0.92))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(120%_80%_at_0%_0%,var(--brand-2)/0.12,transparent_60%),radial-gradient(110%_120%_at_100%_10%,var(--brand-3)/0.14,transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(11, 53, 94, 0.05) 1px, transparent 1px)",
          backgroundSize: "160px 160px",
          maskImage:
            "radial-gradient(80% 110% at 50% 0%, rgba(0,0,0,0.9), transparent 70%)",
        }}
      />

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-24"
        fillScreen={false}
        className="relative"
      >
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-2)] shadow-sm backdrop-blur">
            Categories
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Chart your course by category
            </h1>
            <p className="text-lg text-muted-foreground">
              Explore curated lanes of the harbor to find launches tailored to
              your interests, from productivity anchors to AI co-pilots.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="shadow-[0px_25px_55px_-32px_rgba(7,58,104,0.6)]"
            >
              <Link href={BROWSE_PATH}>Browse all products</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[color:var(--brand-1)/0.35] bg-background/80 text-[color:var(--brand-1)]"
            >
              <Link href={MEMBER_PRODUCTS_PATH}>Submit your launch</Link>
            </Button>
          </div>

          <div className="grid gap-4 rounded-2xl border border-[color:var(--brand-1)/0.2] bg-background/80 px-6 py-6 text-left shadow-[0px_25px_60px_-40px_rgba(7,58,104,0.6)] backdrop-blur sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--brand-1)]">
                Active categories
              </p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {categories.length}
              </p>
              <p className="text-xs text-muted-foreground">
                {pluralize(categories.length, "category")} to explore
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[color:var(--brand-1)]">
                Products listed
              </p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {totalProducts.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Makers shipping across the fleet
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[color:var(--brand-1)]">
                Fresh arrivals
              </p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {categories
                  .slice(0, 1)
                  .map((cat: CategoryListItem) => cat.name)
                  .join(" ") || "Daily"}
              </p>
              <p className="text-xs text-muted-foreground">
                Categories gaining new launches right now
              </p>
            </div>
          </div>
        </div>
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        fillScreen={false}
        className="relative"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      </PublicContainer>

      <PublicContainer
        as="section"
        max="marketing"
        paddingY="py-16"
        fillScreen={false}
        className="relative"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-[color:var(--brand-1)/0.18] bg-background/82 px-8 py-12 text-center shadow-[0px_32px_90px_-60px_rgba(7,58,104,0.55)] backdrop-blur">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Can’t find a harbor for your tool?
          </h2>
          <p className="text-muted-foreground">
            Pitch us on a new category and we’ll chart a space for emerging
            trends, then spotlight the first wave of launches.
          </p>
          <Button asChild size="lg" variant="secondary">
            <a href="mailto:hello@shipyardhq.com">Suggest a category</a>
          </Button>
        </div>
      </PublicContainer>
    </main>
  )
}
