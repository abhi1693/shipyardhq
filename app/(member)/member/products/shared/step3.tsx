"use client"

import { useEffect, useMemo, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { Button } from "@/components/atoms/button"
import { FormItem, FormLabel } from "@/components/atoms/form"
import { Badge } from "@/components/atoms/badge"
import { toast } from "sonner"
import {
  checkDomainTxtAction,
  verifyProductDomainAction,
} from "@/actions/admin/products/actions"
import { getRootDomain } from "@/lib/domain"

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
  const domain = useMemo(() => {
    return getRootDomain(website) ?? ""
  }, [website])

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
    <div className="space-y-4">
      <FormItem>
        <FormLabel>Verification</FormLabel>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            Add the following DNS TXT record at your domain provider for
            <span className="font-medium"> {domain || "your domain"}</span>.
          </p>
          <div className="rounded border p-3 bg-muted/50">
            <div>
              <span className="font-medium">Type:</span> TXT
            </div>
            <div>
              <span className="font-medium">Host/Name:</span> @
            </div>
            <div className="flex gap-1">
              <span className="font-medium">Value:</span>
              <code className="break-all">
                {expected || "prod-verif-shipyard-<hash>"}
              </code>
            </div>
          </div>
          {checked ? (
            <div className="pt-2 flex items-center gap-2">
              <span className="text-sm">Status:</span>
              {success ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Badge variant="destructive">Not Found</Badge>
              )}
            </div>
          ) : null}
          <p>
            DNS can take time to propagate (up to a few hours). You may verify
            now to check.
          </p>
        </div>
        <div className="pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleVerify}
            disabled={verifying}
          >
            Verify Now
          </Button>
        </div>
      </FormItem>
    </div>
  )
}
