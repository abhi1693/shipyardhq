"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useSearchParams } from "next/navigation"

import { Card, CardContent } from "@/components/atoms/card"
import CreateButton from "@/components/molecules/CreateButton"
import MemberProductFilters from "@/components/molecules/MemberProductFilters"
import { EntityList } from "@/components/pages/admin/shared/EntityList"
import {
  columns,
  type MemberProductRow,
} from "@/app/(member)/member/products/columns"
import { useListMemberProductsApiV1MemberProductsGet } from "@/lib/generated/fastapi/member"
import type { MemberProductsListPayload } from "@/lib/generated/fastapi/schemas"
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
import { MEMBER_PRODUCTS_ADD_PATH } from "@/lib/routes"
import { ButtonSkeleton } from "@/components/atoms/button.skeleton"
import { CardSkeleton } from "@/components/atoms/card.skeleton"
import { HeadingSkeleton } from "@/components/atoms/heading.skeleton"
import { Skeleton } from "@/components/atoms/skeleton"

type SearchParams = Record<string, string | string[] | undefined>

function toParamString(
  params: URLSearchParams | null,
  key: string,
): string | undefined {
  const value = params?.get(key)
  return value ?? undefined
}

export function MemberProductsPageContent() {
  const searchParams = useSearchParams()
  const params = useMemo<SearchParams>(
    () => ({
      q: toParamString(searchParams, "q"),
      status: toParamString(searchParams, "status"),
      verification: toParamString(searchParams, "verification"),
      sort: toParamString(searchParams, "sort"),
      page: toParamString(searchParams, "page"),
      limit: toParamString(searchParams, "limit"),
    }),
    [searchParams],
  )

  const productsQuery =
    useListMemberProductsApiV1MemberProductsGet<MemberProductsListPayload | null>(
      params,
      {
        query: {
          select: (response) => (response.status === 200 ? response.data : null),
        },
      },
    )
  const payload = productsQuery.data
  const products = payload?.products ?? []
  const total = payload?.total ?? 0
  const perPage = Math.max(1, parseInt(String(payload?.limit || 10), 10) || 10)
  const pageCount = Math.max(1, Math.ceil(total / perPage))

  const qParam = toParamString(searchParams, "q")
  const statusParam = toParamString(searchParams, "status")
  const verificationParam = toParamString(searchParams, "verification")
  const sortParam = toParamString(searchParams, "sort")

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
    ? (getMemberProductStatusLabel(status) ?? status)
    : undefined
  const verificationLabel = !isAllFilterValue(verification)
    ? (getMemberProductVerificationLabel(verification) ?? verification)
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
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-2)/0.35] bg-background/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[color:var(--brand-2-text,#0a5678)] shadow-sm">
            Member Command Deck
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Launch your first product
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Shipyard tracks engagement, verification, and health for every
            launch. Add a product to unlock tailored analytics for your crew.
          </p>
          <CreateButton asChild className="mt-8" label="Add product">
            <Link href={MEMBER_PRODUCTS_ADD_PATH}>Add product</Link>
          </CreateButton>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Products
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Keep your launches polished, verified, and ready for discovery.
          </p>
        </div>
        <CreateButton asChild size="sm" label="Add product">
          <Link href={MEMBER_PRODUCTS_ADD_PATH}>Add product</Link>
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
              No products match the current filters. Adjust them or clear
              filters to see more of your fleet.
            </div>
          ) : null}

          {productsQuery.isLoading ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              Loading your product fleet…
            </div>
          ) : (
            <EntityList
              columns={columns}
              data={products as unknown as MemberProductRow[]}
              pageCount={pageCount}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function MemberProductsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <HeadingSkeleton lines={1} centered={false} />
          <Skeleton className="h-3 w-72 rounded-full" tone="muted" />
        </div>
        <ButtonSkeleton size="sm" labelWidth="7rem" />
      </div>
      <CardSkeleton
        tone="soft"
        radius="lg"
        lines={6}
        showFooter
        className="border border-slate-200/80 bg-white/95"
      />
    </div>
  )
}
