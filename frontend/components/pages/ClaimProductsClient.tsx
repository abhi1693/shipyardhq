"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ColumnDef } from "@tanstack/react-table"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { Card, CardContent } from "@/components/atoms/card"
import { Input } from "@/components/atoms/input"
import { cn } from "@/lib/utils"
import DataTable from "@/components/molecules/DataTable"
import {
  getListClaimableProductsApiV1MemberClaimsProductsGetQueryKey,
  useConfirmClaimDnsApiV1MemberClaimsProductIdDnsConfirmPost,
  useListClaimableProductsApiV1MemberClaimsProductsGet,
  useRequestClaimOtpApiV1MemberClaimsProductIdOtpRequestPost,
  useVerifyClaimOtpApiV1MemberClaimsProductIdOtpVerifyPost,
} from "@/lib/generated/fastapi/member"
import type { FastApiError } from "@/lib/fastapi-fetcher"

type ClaimableProduct = {
  id: string
  name: string
  slug: string
  websiteUrl: string
  domain: string
  expectedTxt: string
}

function getFastApiErrorDetail(error: unknown, fallback: string) {
  const detail = (error as FastApiError | undefined)?.info as
    | { detail?: unknown }
    | undefined
  if (typeof detail?.detail === "string") {
    return detail.detail
  }
  return fallback
}

export function ClaimProductsClient({
  initialQuery = "",
  initialSelectedId = null,
}: {
  initialQuery?: string
  initialSelectedId?: string | null
}) {
  const queryClient = useQueryClient()
  const claimableProductsQuery =
    useListClaimableProductsApiV1MemberClaimsProductsGet<ClaimableProduct[]>(
      undefined,
      {
        query: {
          select: (response) =>
            response.status === 200 ? response.data.products : [],
        },
      },
    )
  const confirmDnsMutation =
    useConfirmClaimDnsApiV1MemberClaimsProductIdDnsConfirmPost()
  const requestOtpMutation =
    useRequestClaimOtpApiV1MemberClaimsProductIdOtpRequestPost()
  const verifyOtpMutation =
    useVerifyClaimOtpApiV1MemberClaimsProductIdOtpVerifyPost()
  const [claimedProductIds, setClaimedProductIds] = useState<string[]>([])
  const [filter, setFilter] = useState(initialQuery)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  )
  const [dnsLocks, setDnsLocks] = useState<Record<string, string | null>>({})
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null)
  const stepTwoRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [dnsPending, startDns] = useTransition()
  const [sendPending, startSend] = useTransition()
  const [verifyPending, startVerify] = useTransition()

  const products = useMemo(() => {
    const claimable = claimableProductsQuery.data ?? []
    if (!claimedProductIds.length) return claimable
    const claimedSet = new Set(claimedProductIds)
    return claimable.filter((product) => !claimedSet.has(product.id))
  }, [claimableProductsQuery.data, claimedProductIds])

  const filteredProducts = useMemo(() => {
    const term = filter.trim().toLowerCase()
    if (!term) return products
    return products.filter((product) => {
      const haystack =
        `${product.name} ${product.domain} ${product.websiteUrl}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [filter, products])

  const selected = useMemo(() => {
    if (!selectedId) return null
    return products.find((p) => p.id === selectedId) ?? null
  }, [products, selectedId])

  const lockExpiresAt = selected ? (dnsLocks[selected.id] ?? null) : null
  const isLocked = Boolean(lockExpiresAt)

  const limitOptions = [10, 20, 30, 40, 50] as const
  const rawLimit = Number(searchParams?.get("limit") ?? "10")
  const limit = limitOptions.includes(rawLimit as (typeof limitOptions)[number])
    ? rawLimit
    : 10
  const rawPage = Number(searchParams?.get("page") ?? "1")
  const total = filteredProducts.length
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const safePage =
    Math.min(Math.max(1, Number.isFinite(rawPage) ? rawPage : 1), pageCount) ||
    1
  const start = (safePage - 1) * limit
  const pageData = filteredProducts.slice(start, start + limit)

  const resetVerificationFields = useCallback(() => {
    setEmail("")
    setCode("")
    setOtpExpiresAt(null)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    stepTwoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [selectedId])

  useEffect(() => {
    if (!selectedId) return
    if (!selected) {
      const nextParams = new URLSearchParams(searchParams ?? undefined)
      nextParams.delete("productId")
      router.replace(`?${nextParams.toString()}`, { scroll: false })
    }
  }, [selected, selectedId, searchParams, router])

  useEffect(() => {
    if (!filteredProducts.length && safePage === 1) return
    if (safePage !== (Number.isFinite(rawPage) ? rawPage : 1)) {
      const nextParams = new URLSearchParams(searchParams ?? undefined)
      nextParams.set("page", String(safePage))
      router.replace(`?${nextParams.toString()}`, { scroll: false })
    }
  }, [filteredProducts.length, rawPage, safePage, searchParams, router])

  const nothingToClaim = products.length === 0
  const noMatches = filteredProducts.length === 0 && !nothingToClaim
  const loadingProducts =
    claimableProductsQuery.isLoading && !claimableProductsQuery.data

  const openVerification = useCallback(
    (productId: string) => {
      resetVerificationFields()
      setSelectedId(productId)
      const nextParams = new URLSearchParams(searchParams ?? undefined)
      nextParams.set("productId", productId)
      router.replace(`?${nextParams.toString()}`, { scroll: true })
    },
    [resetVerificationFields, router, searchParams],
  )

  const pickNextProduct = (productId: string) => {
    const next = products.filter((product) => product.id !== productId)
    const nextSelectedId = next[0]?.id ?? null
    setClaimedProductIds((prev) =>
      prev.includes(productId) ? prev : [...prev, productId],
    )
    resetVerificationFields()
    setSelectedId((prevSelected) => {
      if (prevSelected && prevSelected !== productId) return prevSelected
      return nextSelectedId
    })
    const nextParams = new URLSearchParams(searchParams ?? undefined)
    if (nextSelectedId) nextParams.set("productId", nextSelectedId)
    else nextParams.delete("productId")
    router.replace(`?${nextParams.toString()}`, { scroll: false })
  }

  const columns = useMemo<ColumnDef<ClaimableProduct>[]>(
    () => [
      {
        accessorKey: "name",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Product
          </span>
        ),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">
              {row.original.name}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: "domain",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Domain
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-slate-700">{row.original.domain}</span>
        ),
      },
      {
        accessorKey: "websiteUrl",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Website
          </span>
        ),
        cell: ({ row }) => (
          <span className="line-clamp-1 break-all text-xs text-muted-foreground">
            {row.original.websiteUrl}
          </span>
        ),
      },
      {
        id: "status",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Status
          </span>
        ),
        cell: () => (
          <Badge
            variant="outline"
            className="rounded-full border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
          >
            Unverified
          </Badge>
        ),
      },
      {
        id: "action",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Action
          </span>
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openVerification(row.original.id)}
          >
            Claim
          </Button>
        ),
      },
    ],
    [openVerification],
  )

  const handleDnsClaim = () => {
    if (!selected) return
    startDns(async () => {
      try {
        const result = await confirmDnsMutation.mutateAsync({
          productId: selected.id,
        })
        if (result.status !== 200) {
          throw new Error("DNS verification failed.")
        }
        setDnsLocks((prev) => ({
          ...prev,
          [selected.id]: result.data.lockExpiresAt ?? null,
        }))
        toast.success("DNS verified and locked. Continue with email to transfer.")
      } catch (error) {
        toast.error(
          getFastApiErrorDetail(error, "Unable to verify DNS claim right now."),
        )
        return
      }
    })
  }

  const handleSendOtp = () => {
    if (!selected) return
    if (!isLocked) {
      toast.error("Verify DNS first to lock the domain.")
      return
    }
    startSend(async () => {
      const normalizedEmail = email.trim().toLowerCase()
      if (!normalizedEmail.includes("@")) {
        toast.error("Enter a valid email.")
        return
      }

      try {
        const result = await requestOtpMutation.mutateAsync({
          productId: selected.id,
          data: { email: normalizedEmail },
        })
        if (result.status !== 200) {
          throw new Error("OTP request failed.")
        }
        setOtpExpiresAt(result.data.expiresAt ?? null)
        toast.success("Verification code sent.")
      } catch (error) {
        toast.error(
          getFastApiErrorDetail(error, "Unable to send verification email."),
        )
        return
      }
    })
  }

  const handleVerifyOtp = () => {
    if (!selected) return
    if (!isLocked) {
      toast.error("Verify DNS first to lock the domain.")
      return
    }
    startVerify(async () => {
      const trimmedCode = code.trim()
      if (!/^[0-9]{6}$/.test(trimmedCode)) {
        toast.error("Enter the 6-digit code from your email.")
        return
      }

      try {
        await verifyOtpMutation.mutateAsync({
          productId: selected.id,
          data: { code: trimmedCode },
        })
        await queryClient.invalidateQueries({
          queryKey: getListClaimableProductsApiV1MemberClaimsProductsGetQueryKey(),
        })
        toast.success("Ownership verified via email and transferred.")
      } catch (error) {
        toast.error(getFastApiErrorDetail(error, "Unable to verify claim code."))
        return
      }

      setCode("")
      setEmail("")
      setOtpExpiresAt(null)
      pickNextProduct(selected.id)
      setDnsLocks((prev) => {
        const updated = { ...prev }
        delete updated[selected.id]
        return updated
      })
    })
  }

  if (loadingProducts) {
    return (
      <Card className="border border-slate-200 bg-white/90 shadow-none">
        <CardContent className="space-y-2 p-6">
          <p className="text-sm font-medium text-slate-900">
            Loading claimable products…
          </p>
          <p className="text-xs text-muted-foreground">
            We’re fetching unverified listings you can claim.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (nothingToClaim) {
    return (
      <Card className="border border-slate-200 bg-white/90 shadow-none">
        <CardContent className="space-y-4 p-6">
          <p className="text-lg font-semibold text-foreground">
            Nothing to claim right now
          </p>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t find any unverified products you can claim today.
            If something is missing, double-check the listing status or ping
            support and we&apos;ll investigate.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              All products verified
            </Badge>
            <p className="text-xs text-muted-foreground">
              You&apos;re up to date—come back when you launch a new product.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {!selected ? (
        <Card className="border border-slate-200 bg-white/95 shadow-none">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-start">
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search products or domains"
                  className="w-full sm:w-[280px]"
                />
                {filter ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="border border-slate-200"
                    onClick={() => setFilter("")}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>

            {noMatches ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No listings match that filter. Clear search to see everything
                you can claim.
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={pageData}
                pageCount={pageCount}
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {selected ? (
        <div ref={stepTwoRef}>
          {selected ? (
            <Card className="border border-slate-200 bg-white/95 shadow-[0_20px_58px_-32px_rgba(15,23,42,0.45)]">
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                      Step 2 · Verify ownership
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-semibold text-foreground">
                        {selected.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {selected.domain}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Lock the domain via DNS, then confirm via an email on that
                      domain to transfer ownership.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="border border-slate-200 text-slate-700"
                      onClick={() => {
                        resetVerificationFields()
                        setSelectedId(null)
                        const nextParams = new URLSearchParams(
                          searchParams ?? undefined,
                        )
                        nextParams.delete("productId")
                        nextParams.delete("page")
                        nextParams.delete("limit")
                        router.replace(`?${nextParams.toString()}`, {
                          scroll: true,
                        })
                      }}
                    >
                      Back to listings
                    </Button>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                      {isLocked ? "Locked via DNS" : "Awaiting DNS lock"}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Step 1 · DNS lock
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Add this TXT record to the root of {selected.domain}.
                        Once detected, we lock the claim so you can finish by
                        email.
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        isLocked
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                          : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
                      )}
                    >
                      {isLocked ? "Locked" : "Awaiting DNS"}
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Host / Name
                      </p>
                      <p className="text-sm font-semibold text-foreground">@</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Value / Content
                      </p>
                      <p className="break-all font-mono text-[13px] text-foreground">
                        {selected.expectedTxt}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleDnsClaim}
                      disabled={dnsPending}
                      variant="default"
                    >
                      {dnsPending ? "Checking DNS…" : "Verify & lock DNS"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      We hold the claim for 15 minutes once DNS is detected so
                      you can finish via email.
                    </p>
                  </div>
                  {isLocked && lockExpiresAt ? (
                    <p className="text-xs text-emerald-700">
                      Locked until{" "}
                      {new Date(lockExpiresAt).toLocaleTimeString()}. Finish
                      email verification before it expires.
                    </p>
                  ) : null}
                </div>

                <div
                  className={cn(
                    "relative space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-5",
                    !isLocked && "opacity-70",
                  )}
                >
                  {!isLocked ? (
                    <div className="absolute inset-0 rounded-2xl bg-white/60" />
                  ) : null}
                  <div className="space-y-1 relative">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Step 2 · Email verification
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Send a 6-digit code to an inbox on{" "}
                      <strong>{selected.domain}</strong>. Enter it here to
                      complete the transfer.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1.6fr,auto] relative">
                    <Input
                      type="email"
                      placeholder={`you@${selected.domain}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      disabled={!isLocked}
                    />
                    <Button
                      variant="secondary"
                      disabled={sendPending || !isLocked}
                      onClick={handleSendOtp}
                    >
                      {sendPending ? "Sending…" : "Send code"}
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1.6fr,auto] relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6 digit code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={!isLocked}
                    />
                    <Button
                      variant="default"
                      disabled={
                        !isLocked || verifyPending || code.trim().length === 0
                      }
                      onClick={handleVerifyOtp}
                    >
                      {verifyPending ? "Verifying…" : "Verify & transfer"}
                    </Button>
                  </div>
                  {isLocked ? (
                    otpExpiresAt ? (
                      <p className="text-xs text-muted-foreground">
                        Code expires at{" "}
                        {new Date(otpExpiresAt).toLocaleTimeString()}. You can
                        resend if it expires.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        The code expires after 15 minutes.
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Complete DNS lock to enable email verification.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    What happens next
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Once verified, the listing moves into your account and is
                    marked as verified.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-slate-200 bg-white/90 shadow-none">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6 text-sm text-muted-foreground">
                <span>
                  Select a product in Step 1 to open the verification workspace.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border border-slate-200 text-slate-700"
                  onClick={() => {
                    setSelectedId(null)
                    const nextParams = new URLSearchParams(
                      searchParams ?? undefined,
                    )
                    nextParams.delete("productId")
                    nextParams.delete("page")
                    nextParams.delete("limit")
                    router.replace(`?${nextParams.toString()}`, {
                      scroll: true,
                    })
                  }}
                >
                  Back to listings
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  )
}
