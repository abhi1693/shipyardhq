"use client"

import { useEffect, useMemo, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { Button } from "@/components/atoms/button"
import { FormItem, FormLabel } from "@/components/atoms/form"
import { Badge } from "@/components/atoms/badge"
import { toast } from "sonner"
import { Check, Copy, Loader2 } from "lucide-react"
import {
  checkDomainTxtAction,
  verifyProductDomainAction,
} from "@/actions/admin/products/actions"
import { getRootDomain } from "@/lib/domain"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion"

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
    <div className="space-y-4">
      <FormItem>
        <FormLabel>Verification</FormLabel>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Optional: verify your website to show a verified badge, build trust,
            and appear in verified filters.
          </p>

          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="mb-2 text-xs text-muted-foreground">
              Add this TXT record for{" "}
              <span className="font-medium text-foreground">
                {domain || "your domain"}
              </span>
              .
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Type</div>
                  <div className="font-medium text-foreground">TXT</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Host/Name</div>
                  <code className="text-foreground">@</code>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard("@", "host")}
                  aria-label="Copy host/name"
                  title={copiedKey === "host" ? "Copied" : "Copy"}
                >
                  {copiedKey === "host" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Value</div>
                  <code className="block break-all text-xs text-foreground">
                    {expected || "prod-verif-shipyard-<hash>"}
                  </code>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(
                      expected || "prod-verif-shipyard-<hash>",
                      "value",
                    )
                  }
                  disabled={!expected}
                  aria-label="Copy value"
                  title={copiedKey === "value" ? "Copied" : "Copy"}
                >
                  {copiedKey === "value" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Accordion
            type="single"
            collapsible
            className="rounded-lg border bg-background/60"
          >
            <AccordionItem value="steps" className="px-3">
              <AccordionTrigger className="-mx-3 px-3 text-sm hover:no-underline">
                Setup steps
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>
                    Open your domain&apos;s DNS settings at your provider.
                  </li>
                  <li>Add the TXT record exactly as shown above.</li>
                  <li>Return here and click Verify.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="troubleshooting" className="px-3">
              <AccordionTrigger className="-mx-3 px-3 text-sm hover:no-underline">
                Troubleshooting
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  <li>
                    DNS changes can take time to propagate (sometimes hours).
                  </li>
                  <li>
                    Some providers want host <code>@</code>, others want the
                    root domain.
                  </li>
                  <li>
                    Make sure you added the record to the root domain (not only{" "}
                    <code>www</code>).
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={handleVerify}
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking DNS…
                </>
              ) : (
                "Verify"
              )}
            </Button>

            {verifying ? null : checked ? (
              success ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Not found</Badge>
                  <span className="text-xs text-muted-foreground">
                    Try again in 5–10 minutes.
                  </span>
                </div>
              )
            ) : (
              <span className="text-xs text-muted-foreground">
                You can verify later—this won&apos;t block publishing.
              </span>
            )}
          </div>
        </div>
      </FormItem>
    </div>
  )
}
