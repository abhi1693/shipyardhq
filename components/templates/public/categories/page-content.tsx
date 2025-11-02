import { Suspense } from "react"
import Link from "next/link"

import { CategoryCard } from "@/components/molecules/CategoryCard"
import { BROWSE_PATH, MEMBER_PRODUCTS_PATH, categoryPath } from "@/lib/routes"
import { getCategoriesPagePayload } from "@/lib/categories/cache"
import {
  SponsoredProductsSection,
  SponsoredProductsSkeleton,
} from "@/components/templates/public/homepage/sponsored-products"
import {
  HERO_PRIMARY_BUTTON_CLASSES,
  HERO_SECONDARY_BUTTON_CLASSES,
} from "@/components/templates/public/categories/hero-button-classes"
import HeroStickyBanner from "@/components/layout/HeroStickyBanner"
import PublicTwoColumnLayout from "@/components/layout/public/PublicTwoColumnLayout"

const CATEGORY_CARD_CLASSES =
  "border border-border/50 bg-white p-5 shadow-[0_18px_48px_-40px_rgba(7,58,104,0.35)] hover:border-[color:var(--brand-1)]/40"

export async function CategoriesPageContent() {
  const { categories, highlightCategories } = await getCategoriesPagePayload()

  const primaryHighlights = highlightCategories.slice(0, 8)

  return (
    <main className="relative isolate bg-[#f5f7fb]">
      <PublicTwoColumnLayout
        className="pb-24 pt-12"
        mainClassName="space-y-12"
        sidebarClassName="lg:sticky lg:top-24"
        main={
          <>
            <section className="rounded-3xl border border-border/40 bg-white px-6 py-12 text-center shadow-[0_32px_96px_-60px_rgba(7,58,104,0.35)] sm:px-10">
              <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
                <div className="space-y-4">
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    Discover categories built for every launch
                  </h1>
                </div>
                {primaryHighlights.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {primaryHighlights.map((cat) => (
                      <Link
                        key={cat.id}
                        href={categoryPath(cat.slug)}
                        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-[color:var(--brand-1)]/40 hover:text-foreground"
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
                <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
                  <Link
                    href={BROWSE_PATH}
                    className={`${HERO_PRIMARY_BUTTON_CLASSES} w-full justify-center sm:w-auto`}
                  >
                    Browse every launch
                  </Link>
                  <Link
                    href={MEMBER_PRODUCTS_PATH}
                    className={`${HERO_SECONDARY_BUTTON_CLASSES} w-full justify-center sm:w-auto`}
                  >
                    Submit your category launch
                  </Link>
                </div>
              </div>
            </section>

            <HeroStickyBanner wrapperClassName="px-0" innerClassName="w-full" />

            <section className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {categories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    href={categoryPath(cat.slug)}
                    name={cat.name}
                    icon={cat.icon}
                    description={cat.description}
                    count={cat.count}
                    className={CATEGORY_CARD_CLASSES}
                  />
                ))}
              </div>
            </section>
          </>
        }
        sidebar={
          <>
            <Suspense fallback={<SponsoredProductsSkeleton />}>
              {/* reuse homepage sponsors to surface promoted directory listings */}
              <SponsoredProductsSection />
            </Suspense>

            <section className="rounded-3xl border border-border/40 bg-white px-6 py-8 text-center shadow-[0_24px_80px_-60px_rgba(7,58,104,0.35)]">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Missing a category for your launch?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pitch a new category and we’ll create a dedicated lane, signal
                  it to the community, and feature the first builders ready to
                  launch.
                </p>
                <a
                  href="mailto:support@shipyardhq.dev"
                  className={`${HERO_SECONDARY_BUTTON_CLASSES} w-full justify-center`}
                >
                  Suggest a new category
                </a>
              </div>
            </section>
          </>
        }
      />
    </main>
  )
}
