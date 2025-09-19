import { Metadata } from "next"
import Link from "next/link"

import { Card, CardContent } from "@/components/atoms/card"
import CreateButton from "@/components/molecules/CreateButton"
import MemberProductFilters from "@/components/molecules/MemberProductFilters"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import { columns, type MemberProductRow } from "./columns"
import { getUserProducts } from "@/actions/member/products/actions"
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

type SearchParams = Record<string, string | string[] | undefined>

function toParamString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

export default async function MemberProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const { products, total, limit } = await getUserProducts(params)
  const perPage = Math.max(1, parseInt(String(limit || 10), 10) || 10)
  const pageCount = Math.max(1, Math.ceil(total / perPage))

  const qParam = toParamString(params?.q)
  const statusParam = toParamString(params?.status)
  const verificationParam = toParamString(params?.verification)
  const sortParam = toParamString(params?.sort)

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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[color:var(--brand-1)/0.22] bg-background/92 px-6 py-14 text-center shadow-[0_32px_95px_-70px_rgba(7,78,134,0.55)]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand-2)] shadow-sm">
            Member Command Deck
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">Launch your first product</h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Shipyard tracks engagement, verification, and health for every launch. Add a
            product to unlock tailored insights for your crew.
          </p>
          <CreateButton asChild className="mt-8" label="Add product">
            <Link href="/member/products/add">Add product</Link>
          </CreateButton>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Products</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Keep your launches polished, verified, and ready for discovery.
          </p>
        </div>
        <CreateButton asChild size="sm" label="Add product">
          <Link href="/member/products/add">Add product</Link>
        </CreateButton>
      </div>

      <Card className="border border-transparent bg-white/90 shadow-none">
        <CardContent className="space-y-6 px-0">
          <MemberProductFilters />

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600"
                >
                  <span className="h-1 w-1 rounded-full bg-slate-400" />
                  {filter}
                </span>
              ))}
            </div>
          ) : null}

          {noResultsWithFilters ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              No products match the current filters. Adjust them or clear filters to see
              more of your fleet.
            </div>
          ) : null}

          <EntityList
            columns={columns}
            data={products as unknown as MemberProductRow[]}
            pageCount={pageCount}
          />
        </CardContent>
      </Card>
    </div>
  )
}
