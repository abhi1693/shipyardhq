import {
  ALTERNATIVE_CATALOG_PAGE_SIZE,
  getAlternativeCatalogPage,
} from "@/actions/public/alternatives/actions"
import Link from "next/link"

import { AlternativeCatalogGridClient } from "@/components/molecules/AlternativeCatalogGridClient"
import { BROWSE_PATH, MEMBER_PRODUCTS_PATH } from "@/lib/routes"
import { brandGradient } from "@/lib/ui/tints"
import { launchPrimaryButton, launchSecondaryButton } from "@/lib/ui/buttons"

export async function AlternativesPageContent() {
  const { items, hasMore } = await getAlternativeCatalogPage({
    page: 1,
    pageSize: ALTERNATIVE_CATALOG_PAGE_SIZE,
  })

  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <div className="space-y-12">
          <section
            className={brandGradient(
              "relative overflow-hidden rounded-3xl border border-border px-6 py-16 shadow-sm md:px-12",
            )}
          >
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center gap-6">
              <div className="space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Browse SaaS Alternatives
                </h1>
                <p className="text-base text-white/85 sm:text-lg">
                  Explore vetted third-party tools founders benchmark against
                  Shipyard launches. Find adjacent options, compare positioning,
                  and map category coverage in one curated place.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={MEMBER_PRODUCTS_PATH}
                  className={launchPrimaryButton({ size: "lg" })}
                >
                  Submit your product
                </Link>
                <Link
                  href={BROWSE_PATH}
                  className={launchSecondaryButton({ size: "lg" })}
                >
                  View Shipyard directory
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-white/95 px-4 py-8 shadow-sm sm:px-6 lg:px-8">
            <AlternativeCatalogGridClient
              initialItems={items}
              initialHasMore={hasMore}
              initialPage={2}
              pageSize={ALTERNATIVE_CATALOG_PAGE_SIZE}
            />
          </section>
        </div>
      </div>
    </main>
  )
}
