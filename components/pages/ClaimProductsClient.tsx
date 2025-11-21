"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  claimProductViaDnsAction,
  sendProductClaimOtpAction,
  verifyProductClaimOtpAction,
} from "@/actions/member/products/claim"
import { Badge } from "@/components/atoms/badge"
import { Button } from "@/components/atoms/button"
import { Card, CardContent } from "@/components/atoms/card"
import { Input } from "@/components/atoms/input"
import { cn } from "@/lib/utils"

type ClaimableProduct = {
  id: string
  name: string
  slug: string
  websiteUrl: string
  domain: string
  expectedTxt: string
}

function removeProduct(
  products: ClaimableProduct[],
  productId: string,
): ClaimableProduct[] {
  return products.filter((product) => product.id !== productId)
}

export function ClaimProductsClient({
  products: initialProducts,
}: {
  products: ClaimableProduct[]
}) {
  const [products, setProducts] =
    useState<ClaimableProduct[]>(initialProducts)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProducts[0]?.id ?? null,
  )
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null)

  const [dnsPending, startDns] = useTransition()
  const [sendPending, startSend] = useTransition()
  const [verifyPending, startVerify] = useTransition()

  const selected = useMemo(() => {
    if (!selectedId) return null
    return products.find((p) => p.id === selectedId) ?? null
  }, [products, selectedId])

  const nothingToClaim = products.length === 0

  const pickNextProduct = (productId: string) => {
    setProducts((prev) => {
      const next = removeProduct(prev, productId)
      setSelectedId((prevSelected) => {
        if (prevSelected && prevSelected !== productId) return prevSelected
        return next[0]?.id ?? null
      })
      return next
    })
  }

  const handleDnsClaim = () => {
    if (!selected) return
    startDns(async () => {
      const res = await claimProductViaDnsAction(selected.id)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success("Ownership verified via DNS and transferred.")
      pickNextProduct(selected.id)
    })
  }

  const handleSendOtp = () => {
    if (!selected) return
    startSend(async () => {
      const res = await sendProductClaimOtpAction(selected.id, email)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      setOtpExpiresAt(res.expiresAt ?? null)
      toast.success("Verification code sent.")
    })
  }

  const handleVerifyOtp = () => {
    if (!selected) return
    startVerify(async () => {
      const res = await verifyProductClaimOtpAction(selected.id, code)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success("Ownership verified via email and transferred.")
      setCode("")
      setEmail("")
      setOtpExpiresAt(null)
      pickNextProduct(selected.id)
    })
  }

  if (nothingToClaim) {
    return (
      <Card className="border border-slate-200 bg-white/90 shadow-none">
        <CardContent className="space-y-3 p-6">
          <p className="text-lg font-semibold text-foreground">
            Nothing to claim right now
          </p>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t find any unverified products you can claim today.
            If you think something is missing, double-check the product&apos;s
            verification status or reach out to support.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="border border-slate-200 bg-white/90 shadow-none md:col-span-1">
        <CardContent className="divide-y divide-slate-100 p-0">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => setSelectedId(product.id)}
              className={cn(
                "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition hover:bg-slate-50",
                selected?.id === product.id
                  ? "bg-slate-50/80 text-foreground"
                  : "text-foreground",
              )}
            >
              <span className="text-sm font-semibold">{product.name}</span>
              <span className="text-xs text-muted-foreground">
                {product.domain}
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                >
                  Unverified
                </Badge>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="md:col-span-2">
        {selected ? (
          <Card className="border border-slate-200 bg-white/95 shadow-none">
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  Claim product
                </p>
                <h2 className="text-2xl font-semibold text-foreground">
                  {selected.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Verify you control {selected.domain} by using DNS or an email
                  address on that domain. Once verified, ownership transfers to
                  you and the listing becomes verified.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      DNS TXT verification
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Add this TXT record at the root of {selected.domain} and
                      we&apos;ll verify instantly when found.
                    </p>
                  </div>
                  <Badge className="rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                    Recommended
                  </Badge>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Host / Name
                    </p>
                    <p className="text-sm font-semibold text-foreground">@</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Value / Content
                    </p>
                    <p className="break-all font-mono text-xs text-foreground">
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
                    {dnsPending ? "Checking DNS…" : "Verify via DNS"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    DNS changes can take a few minutes to propagate.
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-white/60 p-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Email verification
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Use an inbox on <strong>{selected.domain}</strong> to
                    receive a one-time code.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
                  <Input
                    type="email"
                    placeholder={`you@${selected.domain}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <Button
                    variant="secondary"
                    disabled={sendPending}
                    onClick={handleSendOtp}
                  >
                    {sendPending ? "Sending…" : "Send code"}
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6 digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <Button
                    variant="default"
                    disabled={verifyPending || code.trim().length === 0}
                    onClick={handleVerifyOtp}
                  >
                    {verifyPending ? "Verifying…" : "Verify & claim"}
                  </Button>
                </div>
                {otpExpiresAt ? (
                  <p className="text-xs text-muted-foreground">
                    Code expires at {new Date(otpExpiresAt).toLocaleTimeString()}
                    . You can resend if it expires.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The code expires after 15 minutes.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-slate-200 bg-white/90 shadow-none">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Choose a product to start claiming.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
