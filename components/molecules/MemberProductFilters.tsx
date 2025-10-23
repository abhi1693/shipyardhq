"use client"

import { useCallback, useEffect, useOptimistic } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/atoms/input"
import InlineSelect from "@/components/molecules/InlineSelect"
import { Button } from "@/components/atoms/button"
import { buildQuery } from "@/lib/urlParams"
import { MEMBER_PRODUCTS_PATH } from "@/lib/routes"
import {
  MEMBER_PRODUCT_FILTER_ALL,
  memberProductSortOptions,
  memberProductSortOptionValues,
  memberProductStatusOptions,
  memberProductStatusOptionValues,
  memberProductVerificationOptions,
  memberProductVerificationOptionValues,
} from "@/lib/member-products/filter-options"

export default function MemberProductFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const statusParam = params?.get("status") ?? MEMBER_PRODUCT_FILTER_ALL
  const normalizedStatus = memberProductStatusOptionValues.has(statusParam)
    ? statusParam
    : MEMBER_PRODUCT_FILTER_ALL

  const verificationParam =
    params?.get("verification") ?? MEMBER_PRODUCT_FILTER_ALL
  const normalizedVerification = memberProductVerificationOptionValues.has(
    verificationParam,
  )
    ? verificationParam
    : MEMBER_PRODUCT_FILTER_ALL

  const sortParam = params?.get("sort") ?? "new"
  const normalizedSort = memberProductSortOptionValues.has(sortParam)
    ? sortParam
    : "new"

  const current = {
    q: params?.get("q") ?? "",
    status: normalizedStatus,
    verification: normalizedVerification,
    sort: normalizedSort,
  }

  const [q, setQ] = useOptimistic(
    current.q,
    (prev, next: string | ((value: string) => string)) =>
      typeof next === "function" ? (next as (value: string) => string)(prev) : next,
  )

  // Debounced search push
  useEffect(() => {
    const id = setTimeout(() => {
      const url = buildQuery(
        pathname ?? MEMBER_PRODUCTS_PATH,
        params?.toString() ?? "",
        {
          q: q.length ? q : undefined,
          page: "1",
        },
      )
      router.push(url)
    }, 350)
    return () => clearTimeout(id)
  }, [q, pathname, params, router])

  const onSelect = useCallback(
    (key: "status" | "verification" | "sort", value: string) => {
      const v = value === MEMBER_PRODUCT_FILTER_ALL ? undefined : value
      const url = buildQuery(
        pathname ?? MEMBER_PRODUCTS_PATH,
        params?.toString() ?? "",
        {
          [key]: v,
          page: "1",
        },
      )
      router.push(url)
    },
    [pathname, params, router],
  )

  const hasFilters =
    current.q.length > 0 ||
    current.status !== MEMBER_PRODUCT_FILTER_ALL ||
    current.verification !== MEMBER_PRODUCT_FILTER_ALL ||
    current.sort !== "new"

  return (
    <div className="rounded-xl bg-background/95 px-3 py-3 shadow-[0px_18px_40px_-45px_rgba(7,78,134,0.45)] sm:px-4">
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        <div className="flex items-center gap-3 whitespace-nowrap">
          <Input
            placeholder="Search by name or slug..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-52 shrink-0 rounded-lg border border-[color:var(--brand-1)/0.2] bg-background/90"
            aria-label="Search products"
          />
          <InlineSelect
            value={current.status}
            onValueChange={(v) => onSelect("status", v)}
            options={memberProductStatusOptions}
            triggerClassName="h-9 min-w-[9rem] rounded-lg border border-[color:var(--brand-1)/0.2] bg-background/90"
            placeholder="Status"
          />
          <InlineSelect
            value={current.verification}
            onValueChange={(v) => onSelect("verification", v)}
            options={memberProductVerificationOptions}
            triggerClassName="h-9 min-w-[9rem] rounded-lg border border-[color:var(--brand-1)/0.2] bg-background/90"
            placeholder="Domain"
          />
          <InlineSelect
            value={current.sort}
            onValueChange={(v) => onSelect("sort", v)}
            options={memberProductSortOptions}
            triggerClassName="h-9 min-w-[11rem] rounded-lg border border-[color:var(--brand-1)/0.2] bg-background/90"
            placeholder="Sort"
          />
        </div>
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 whitespace-nowrap border border-[color:var(--brand-1)/0.25] bg-background/80"
            onClick={() => router.push(pathname ?? MEMBER_PRODUCTS_PATH)}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
