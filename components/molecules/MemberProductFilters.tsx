"use client"

import { useCallback, useState, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/atoms/input"
import InlineSelect from "@/components/molecules/InlineSelect"
import { Button } from "@/components/atoms/button"
import { buildQuery } from "@/lib/urlParams"

const statusOptions = [
  { value: "__all__", label: "All status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

const statusOptionValues = new Set(statusOptions.map((opt) => opt.value))

const verificationOptions = [
  { value: "__all__", label: "All domains" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
]

const sortOptions = [
  { value: "new", label: "Newest" },
  { value: "updated", label: "Recently updated" },
  { value: "az", label: "A–Z" },
  { value: "clicks", label: "Most clicks" },
  { value: "upvotes", label: "Most upvotes" },
]

export default function MemberProductFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const statusParam = params?.get("status") ?? "__all__"
  const normalizedStatus = statusOptionValues.has(statusParam)
    ? statusParam
    : "__all__"

  const current = {
    q: params?.get("q") ?? "",
    status: normalizedStatus,
    verification: params?.get("verification") ?? "__all__",
    sort: params?.get("sort") ?? "new",
  }

  const [q, setQ] = useState(current.q)

  useEffect(() => {
    setQ(current.q)
  }, [current.q])

  // Debounced search push
  useEffect(() => {
    const id = setTimeout(() => {
      const url = buildQuery(
        pathname ?? "/member/products",
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
      const v = value === "__all__" ? undefined : value
      const url = buildQuery(
        pathname ?? "/member/products",
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
    current.status !== "__all__" ||
    current.verification !== "__all__" ||
    current.sort !== "new"

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 mb-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2 flex-1">
        <Input
          placeholder="Search by name or slug…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
          aria-label="Search products"
        />
        <InlineSelect
          value={current.status}
          onValueChange={(v) => onSelect("status", v)}
          options={statusOptions}
          triggerClassName="h-8 min-w-[9rem]"
          placeholder="Status"
        />
        <InlineSelect
          value={current.verification}
          onValueChange={(v) => onSelect("verification", v)}
          options={verificationOptions}
          triggerClassName="h-8 min-w-[9rem]"
          placeholder="Domain"
        />
        <InlineSelect
          value={current.sort}
          onValueChange={(v) => onSelect("sort", v)}
          options={sortOptions}
          triggerClassName="h-8 min-w-[11rem]"
          placeholder="Sort"
        />
      </div>
      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(pathname ?? "/member/products")}
        >
          Clear
        </Button>
      )}
    </div>
  )
}
