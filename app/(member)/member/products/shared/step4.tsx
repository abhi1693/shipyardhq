"use client"

import { useEffect, useMemo, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { Button } from "@/components/atoms/button"
import { FormItem, FormLabel } from "@/components/atoms/form"
import { toast } from "sonner"
import {
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  RadioTower,
  ShieldCheck,
  Terminal,
} from "lucide-react"
import {
  checkDomainTxtAction,
  verifyProductDomainAction,
} from "@/actions/products/actions"
import { getRootDomain } from "@/lib/domain"
import { DraftFormSection } from "@/components/pages/products/_components/DraftFormSection"

export default function Step3({
  productId,
  persistOnVerify = false,
}: {
  productId?: string
  persistOnVerify?: boolean
}) {
  const form = useFormContext()
  const website = useWatch({
    control: form.control,
    name: "websiteUrl",
  }) as string
  const expected = useWatch({
    control: form.control,
    name: "verificationExpectedTxt",
  }) as string | undefined
  const checked = useWatch({
    control: form.control,
    name: "verificationChecked",
  }) as boolean | undefined
  const success = useWatch({
    control: form.control,
    name: "verificationSuccess",
  }) as boolean | undefined
  const [verifying, setVerifying] = useState(false)
  const [copiedKey, setCopiedKey] = useState<null | "host" | "value">(null)
  const phasePercent = success ? 100 : verifying ? 90 : 75
  const circumference = 2 * Math.PI * 80
  const gaugeOffset = circumference - (phasePercent / 100) * circumference
  const domain = useMemo(() => {
    return getRootDomain(website) ?? ""
  }, [website])

  async function copyToClipboard(text: string, key: "host" | "value") {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(null), 1200)
    } catch {
      toast.error("Copy failed. Please copy manually.")
    }
  }

  useEffect(() => {
    let active = true

    async function sha256Hex(input: string): Promise<string> {
      const enc = new TextEncoder().encode(input)
      const buf = await crypto.subtle.digest("SHA-256", enc)
      const bytes = Array.from(new Uint8Array(buf))
      return bytes.map((b) => b.toString(16).padStart(2, "0")).join("")
    }

    async function load() {
      if (!website) {
        form.setValue("verificationExpectedTxt", "")
        // Reset verification state when URL changes/clears
        form.setValue("verificationChecked", false)
        form.setValue("verificationSuccess", false)
        return
      }

      // Compute expected locally to avoid placeholder flicker
      try {
        const norm = website.trim().toLowerCase()
        const hex = await sha256Hex(norm)
        const localExpected = `prod-verif-shipyard-${hex.slice(0, 12)}`
        if (active) form.setValue("verificationExpectedTxt", localExpected)
      } catch {}

      // Also attempt DNS check (best effort) and keep expected in sync
      try {
        const res = await checkDomainTxtAction(website)
        if (active && "expected" in res && res.expected) {
          form.setValue("verificationExpectedTxt", res.expected)
        }
      } catch {}

      // Any website change invalidates prior verification result
      form.setValue("verificationChecked", false)
      form.setValue("verificationSuccess", false)
    }

    load()
    return () => {
      active = false
    }
  }, [website, form])

  async function handleVerify() {
    if (!website) return toast.error("Enter a valid Website URL first")
    setVerifying(true)
    try {
      const res = await checkDomainTxtAction(website)
      if ("error" in res) return toast.error(res.error)
      form.setValue("verificationChecked", true)
      form.setValue("verificationSuccess", !!res.success)
      if (res.expected) form.setValue("verificationExpectedTxt", res.expected)
      if (res.success) {
        // Persist verification for existing products (edit flow only)
        if (persistOnVerify && productId) {
          const persist = await verifyProductDomainAction(productId)
          if (persist?.success) {
            toast.success("Domain verified and saved.")
          } else if (persist?.error) {
            // If persistence fails, still show local success but inform user
            toast.error(`Verified, but save failed: ${persist.error}`)
          }
        } else {
          toast.success("TXT record found. Looks good!")
        }
      } else toast.error("TXT record not found yet. Please try again later.")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <DraftFormSection
      title="System Validation & Handshake"
      description="Verify domain ownership by adding a TXT record to DNS."
      icon={Terminal}
    >
      <FormItem>
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-6">
            <div className="absolute right-4 top-4">
              <span
                className={[
                  "inline-flex items-center gap-2 rounded px-2 py-1 text-[11px] font-semibold uppercase",
                  success
                    ? "bg-[#16a34a]/10 text-[#16a34a]"
                    : checked
                      ? "bg-[#ffdad6] text-[#93000a]"
                      : "bg-[#F97316]/10 text-[#F97316]",
                ].join(" ")}
              >
                <span className="relative flex size-2">
                  {!success && !checked ? (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#F97316] opacity-60" />
                  ) : null}
                  <span
                    className={[
                      "relative inline-flex size-2 rounded-full",
                      success
                        ? "bg-[#16a34a]"
                        : checked
                          ? "bg-[#ba1a1a]"
                          : "bg-[#F97316]",
                    ].join(" ")}
                  />
                </span>
                {success
                  ? "Handshake complete"
                  : checked
                    ? "Record not found"
                    : verifying
                      ? "Verifying DNS"
                      : "Pending handshake"}
              </span>
            </div>

            <div className="flex flex-col items-center pt-4">
              <div className="relative flex size-48 items-center justify-center">
                <svg
                  className="size-full -rotate-90"
                  viewBox="0 0 192 192"
                  aria-hidden="true"
                >
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="transparent"
                    stroke="#dce9ff"
                    strokeWidth="8"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="transparent"
                    stroke={success ? "#16a34a" : "#0051d5"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={gaugeOffset}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span
                    className={[
                      "text-[32px] font-bold leading-10",
                      success ? "text-[#16a34a]" : "text-[#0051d5]",
                    ].join(" ")}
                  >
                    {phasePercent}%
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#43474c]">
                    Phase complete
                  </span>
                </div>
              </div>

              <div className="mt-4 grid w-full max-w-md grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="h-1 overflow-hidden rounded-full bg-[#dce9ff]"
                  >
                    <div
                      className={[
                        "h-full rounded-full",
                        success || index < 3 ? "w-full" : "w-1/2",
                        success ? "bg-[#16a34a]" : "bg-[#0051d5]",
                      ].join(" ")}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="size-5 text-[#0051d5]"
                  aria-hidden="true"
                />
                <h3 className="text-[18px] font-semibold leading-6 text-black">
                  TXT Record Verification
                </h3>
              </div>
              <span className="w-fit rounded bg-[#dce9ff] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#43474c]">
                Domain: {domain || "your domain"}
              </span>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <FormLabel className="text-[12px] uppercase tracking-[0.05em] text-[#43474c]">
                    Type
                  </FormLabel>
                  <div className="rounded-lg border border-[#C4C6CD] bg-[#eff4ff] px-4 py-3 text-sm font-medium text-black">
                    TXT
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <FormLabel className="text-[12px] uppercase tracking-[0.05em] text-[#43474c]">
                    Host / Name
                  </FormLabel>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-[#C4C6CD] bg-[#eff4ff] px-4 py-3">
                    <code className="select-all text-sm font-medium text-black">
                      @
                    </code>
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#0051d5] transition-colors hover:text-[#003ea7]"
                      onClick={() => copyToClipboard("@", "host")}
                    >
                      {copiedKey === "host" ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : (
                        <Copy className="size-4" aria-hidden="true" />
                      )}
                      <span className="hidden sm:inline">
                        {copiedKey === "host" ? "Copied" : "Copy"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel className="text-[12px] uppercase tracking-[0.05em] text-[#43474c]">
                  Value / Destination
                </FormLabel>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-[#C4C6CD] bg-[#eff4ff] px-4 py-3">
                  <code className="break-all text-sm font-medium text-black">
                    {expected || "prod-verif-shipyard-<hash>"}
                  </code>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#0051d5] transition-colors hover:text-[#003ea7] disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() =>
                      copyToClipboard(
                        expected || "prod-verif-shipyard-<hash>",
                        "value",
                      )
                    }
                    disabled={!expected}
                  >
                    {copiedKey === "value" ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Copy className="size-4" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">
                      {copiedKey === "value" ? "Copied" : "Copy"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 pt-1">
                <Button
                  type="button"
                  className={[
                    "h-11 rounded-lg px-8 text-sm font-bold text-white shadow-sm transition-all active:scale-95",
                    success
                      ? "bg-[#16a34a] hover:bg-[#16a34a]/90"
                      : "bg-[#0051d5] hover:bg-[#0051d5]/90",
                  ].join(" ")}
                  onClick={handleVerify}
                  disabled={verifying}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying DNS...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="size-4" />
                      Verification Success
                    </>
                  ) : (
                    <>
                      <RadioTower className="size-4" />
                      Verify Record
                    </>
                  )}
                </Button>

                {!success && checked ? (
                  <p className="text-xs text-[#93000a]">
                    TXT record not found yet. DNS changes can take a few minutes
                    to propagate.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </FormItem>
    </DraftFormSection>
  )
}
