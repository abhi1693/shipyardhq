import { Metadata } from "next"
import Link from "next/link"

import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns, type MemberProductRow } from "./columns"
import { getUserProducts } from "@/actions/member/products/actions"
import MemberProductFilters from "@/components/molecules/MemberProductFilters"
import AddButton from "@/components/molecules/AddButton"
import {
  MEMBER_PRODUCT_FILTER_ALL,
  getMemberProductSortLabel,
  getMemberProductStatusLabel,
  getMemberProductVerificationLabel,
  isAllFilterValue,
  memberProductSortOptionValues,
  memberProductStatusOptionValues,
  memberProductVerificationOptionValues,
} from "@/lib/member-products/filter-options"

export const metadata: Metadata = {
  title: "Products",
  description: "Manage your products, chart growth, and track performance.",
}

function toParamString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

export default async function MemberProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { products, total, limit } = await getUserProducts(params)
  const perPage = Math.max(1, parseInt(String(limit || 10), 10) || 10)
  const pageCount = Math.max(1, Math.ceil(total / perPage))

  const qParam = toParamString(params?.["q"])
  const statusParam = toParamString(params?.["status"])
  const verificationParam = toParamString(params?.["verification"])
  const sortParam = toParamString(params?.["sort"])

  const q = qParam?.trim() ?? ""

  const status =
    statusParam && memberProductStatusOptionValues.has(statusParam)
      ? statusParam
      : MEMBER_PRODUCT_FILTER_ALL

  const verification =
    verificationParam &&
    memberProductVerificationOptionValues.has(verificationParam)
      ? verificationParam
      : MEMBER_PRODUCT_FILTER_ALL

  const sort =
    sortParam && memberProductSortOptionValues.has(sortParam)
      ? sortParam
      : "new"

  const sortLabel = getMemberProductSortLabel(sort) ?? "Newest"
  const statusLabel = !isAllFilterValue(status)
    ? getMemberProductStatusLabel(status) ?? status
    : undefined
  const verificationLabel = !isAllFilterValue(verification)
    ? getMemberProductVerificationLabel(verification) ?? verification
    : undefined

  const activeFilters: string[] = []
  if (q.length) activeFilters.push(`Search: "${q}"`)
  if (statusLabel) activeFilters.push(`Status: ${statusLabel}`)
  if (verificationLabel) activeFilters.push(`Domain: ${verificationLabel}`)
  if (sort && sort !== "new") activeFilters.push(`Sort: ${sortLabel}`)

  const hasActiveFilters = activeFilters.length > 0
  const noProductsYet = total === 0 && !hasActiveFilters
  const noResultsWithFilters = total === 0 && hasActiveFilters

  if (noProductsYet) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-sm">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Member Command Deck
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Launch your first product
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Shipyard tracks engagement, verification, and health for every launch.
            Add your first product to start receiving insights tailored to your crew.
          </p>
          <Link href="/member/products/add" className="mt-6">
            <AddButton label="Add Product" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-2xl border border-[color:var(--brand-1)/0.14] bg-background/96 px-4 py-6 shadow-[0px_24px_60px_-55px_rgba(7,78,134,0.45)] sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,var(--brand-1)/0.16,transparent_58%)]"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.3] bg-background/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand-2)] shadow-sm">
              Member Command Deck
            </span>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Products
              </h1>
              <p className="text-sm text-muted-foreground">
                Keep your launches polished, verified, and ready for the spotlight.
              </p>
            </div>
          </div>
          <Link href="/member/products/add" className="sm:self-start">
            <AddButton label="Add Product" />
          </Link>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <span
                key={filter}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-1)/0.18] bg-background/85 px-3 py-1 text-[11px] text-muted-foreground shadow-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-3)]" />
                {filter}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-[color:var(--brand-1)/0.12] bg-background/92 p-4 shadow-[0px_20px_55px_-50px_rgba(7,78,134,0.45)] sm:p-5">
          <MemberProductFilters />
          {noResultsWithFilters ? (
            <div className="mt-4 rounded-lg border border-dashed border-[color:var(--brand-1)/0.2] bg-background/80 px-4 py-4 text-sm text-muted-foreground">
              No products match the current filters. Adjust them or clear filters to
              see more of your fleet.
            </div>
          ) : null}
          <div className="mt-4 rounded-xl bg-background/96 p-2 [&_[data-slot=scroll-area]]:rounded-lg">
            <EntityList
              columns={columns}
              data={products as unknown as MemberProductRow[]}
              pageCount={pageCount}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
