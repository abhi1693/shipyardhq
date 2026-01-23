import Link from "next/link"

import {
  getAlternativeHighlightsApiV1PublicAlternativesFeaturedGet,
  getCategoryHighlightsApiV1PublicCategoriesHighlightsGet,
  getUseCaseHighlightsApiV1PublicUseCasesHighlightsGet,
} from "@/lib/generated/fastapi/public-homepage"
import { Skeleton } from "@/components/atoms/skeleton"
import {
  ALTERNATIVES_PATH,
  CATEGORIES_PATH,
  USE_CASES_PATH,
  alternativePath,
  categoryPath,
  usecasePath,
} from "@/lib/routes"

const CATEGORY_PREVIEW_LIMIT = 3
const USE_CASE_PREVIEW_LIMIT = 3
const ALTERNATIVE_PREVIEW_LIMIT = 3

const containerClasses =
  "rounded-xl border border-border/40 bg-white/90 px-4 py-4"

const actionLinkClasses =
  "text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-1)] transition hover:opacity-80"

const sectionLabelClasses =
  "text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"

const listClasses = "space-y-1.5"

const listItemClasses =
  "group flex items-center gap-2 text-xs text-foreground/90 transition hover:text-foreground"

const bulletClasses =
  "h-1.5 w-1.5 rounded-full bg-[color:var(--brand-1)] opacity-60 group-hover:opacity-100"

export async function DirectoryHighlightsSidebar() {
  const [categoriesResponse, useCasesResponse, alternativesResponse] =
    await Promise.all([
      getCategoryHighlightsApiV1PublicCategoriesHighlightsGet({
        limit: CATEGORY_PREVIEW_LIMIT,
      }),
      getUseCaseHighlightsApiV1PublicUseCasesHighlightsGet({
        limit: USE_CASE_PREVIEW_LIMIT,
      }),
      getAlternativeHighlightsApiV1PublicAlternativesFeaturedGet({
        limit: ALTERNATIVE_PREVIEW_LIMIT,
      }),
    ])
  const categories = categoriesResponse.data
  const useCases = useCasesResponse.data
  const alternatives = alternativesResponse.data
  const hasAlternatives = alternatives.length > 0

  return (
    <section className={containerClasses} data-testid="homepage-directory">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          Quick shortcuts
        </h2>
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className={sectionLabelClasses}>Categories</p>
            <Link href={CATEGORIES_PATH} className={actionLinkClasses}>
              View all
            </Link>
          </div>
          {categories.length > 0 ? (
            <ul className={listClasses}>
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={categoryPath(category.slug)}
                    className={listItemClasses}
                  >
                    <span className={bulletClasses} aria-hidden />
                    <span className="line-clamp-1">{category.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              New categories are on the way.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className={sectionLabelClasses}>Use cases</p>
            <Link href={USE_CASES_PATH} className={actionLinkClasses}>
              View all
            </Link>
          </div>
          {useCases.length > 0 ? (
            <ul className={listClasses}>
              {useCases.map((useCase) => (
                <li key={useCase.id}>
                  <Link
                    href={usecasePath(useCase.slug)}
                    className={listItemClasses}
                  >
                    <span className={bulletClasses} aria-hidden />
                    <span className="line-clamp-1">{useCase.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              No use cases yet. Check back soon.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className={sectionLabelClasses}>Alternatives</p>
            <Link href={ALTERNATIVES_PATH} className={actionLinkClasses}>
              View all
            </Link>
          </div>
          {hasAlternatives ? (
            <ul className={listClasses}>
              {alternatives.map((alternative) => (
                <li key={alternative.id}>
                  <Link
                    href={alternativePath(alternative.slug)}
                    className={listItemClasses}
                  >
                    <span className={bulletClasses} aria-hidden />
                    <span className="line-clamp-1">{alternative.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              New alternatives are being curated.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export function DirectoryHighlightsSidebarSkeleton() {
  return (
    <section className={containerClasses} aria-hidden>
      <div className="space-y-1">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-4 w-28 rounded-full" />
      </div>
      <div className="mt-4 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`directory-sidebar-skeleton-${index}`}
            className="space-y-2"
          >
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="h-3 w-10 rounded-full" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, pillIndex) => (
                <Skeleton
                  key={`directory-sidebar-pill-${index}-${pillIndex}`}
                  className="h-3 w-40 rounded-full"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
