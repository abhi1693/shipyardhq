"use client"

import { useFormContext } from "react-hook-form"
import { ReactNode, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import ImageUploadField from "@/components/molecules/ImageUploadField"
import { Textarea } from "@/components/atoms/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Checkbox } from "@/components/atoms/checkbox"
import { cleanWebsiteUrlInput } from "@/lib/productWizard/transform"
import { Button } from "@/components/atoms/button"
import { toast } from "sonner"
import type { ProductAutofillSuggestion } from "@/lib/productWizard/autofill"

type Props = {
  categories: { id: string; name: string }[]
  platforms: readonly string[]
  productId?: string
  lockWebsiteUrl?: boolean
  rightOfWebsite?: ReactNode
  enableAutofill?: boolean
}

export default function Step1({
  categories,
  platforms,
  productId,
  lockWebsiteUrl,
  rightOfWebsite,
  enableAutofill,
}: Props) {
  const form = useFormContext()
  const [previewDesc, setPreviewDesc] = useState(false)
  const [autofilling, setAutofilling] = useState(false)

  async function handleAutofill() {
    const currentUrl = cleanWebsiteUrlInput(
      (form.getValues("websiteUrl") as string) || "",
    )
    if (!currentUrl) {
      toast.error("Enter a website URL before running auto-fill")
      return
    }

    form.setValue("websiteUrl", currentUrl, {
      shouldDirty: true,
      shouldValidate: true,
    })

    setAutofilling(true)
    try {
      const response = await fetch("/api/products/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: currentUrl,
          categories: categories.map((c) => c.name),
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to auto-fill from this URL")
      }

      const suggestion = payload?.suggestion as
        | ProductAutofillSuggestion
        | undefined
      const warnings: string[] = Array.isArray(payload?.warnings)
        ? payload.warnings
        : []

      if (!suggestion || Object.keys(suggestion).length === 0) {
        toast.info("No details were detected for this website yet")
        return
      }

      applySuggestion(suggestion)
      toast.success("Product details auto-filled")

      if (warnings.length) {
        toast.warning(warnings.join("\n"))
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to auto-fill product details"
      toast.error(message)
    } finally {
      setAutofilling(false)
    }
  }

  function applySuggestion(suggestion: ProductAutofillSuggestion) {
    if (suggestion.name) {
      form.setValue("name", suggestion.name, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.tagline) {
      form.setValue("tagline", suggestion.tagline, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.description) {
      form.setValue("description", suggestion.description, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.logo) {
      form.setValue("logo", suggestion.logo, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.type) {
      form.setValue("type", suggestion.type, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.pricingModel) {
      form.setValue("pricingModel", suggestion.pricingModel, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (typeof suggestion.startingPriceCents === "number") {
      form.setValue("startingPriceCents", suggestion.startingPriceCents, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.currencyCode) {
      form.setValue("currencyCode", suggestion.currencyCode, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.keywords?.length) {
      form.setValue("keywordsText", suggestion.keywords.join(", "), {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.platforms?.length) {
      form.setValue("platforms", suggestion.platforms, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.categoryName) {
      const lower = suggestion.categoryName.toLowerCase()
      const match =
        categories.find((c) => c.name.toLowerCase() === lower) ||
        categories.find((c) => lower.includes(c.name.toLowerCase())) ||
        categories.find((c) => c.name.toLowerCase().includes(lower))
      if (match) {
        form.setValue("categoryId", match.id, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    }

    if (suggestion.githubUrl) {
      form.setValue("githubUrl", suggestion.githubUrl, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.twitterUrl) {
      form.setValue("twitterUrl", suggestion.twitterUrl, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.demoUrl) {
      form.setValue("demoUrl", suggestion.demoUrl, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.contactEmail) {
      form.setValue("contactEmail", suggestion.contactEmail, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.ctaLabel) {
      form.setValue("ctaLabel", suggestion.ctaLabel, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    if (suggestion.ctaUrl) {
      form.setValue("ctaUrl", suggestion.ctaUrl, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter product name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="tagline"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tagline</FormLabel>
              <FormControl>
                <Input placeholder="Short tagline" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="websiteUrl"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center justify-between gap-4">
                <span>Website URL</span>
                {enableAutofill ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAutofill}
                    disabled={autofilling || !!lockWebsiteUrl}
                  >
                    {autofilling ? "Auto-filling…" : "Auto-fill"}
                  </Button>
                ) : null}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!!lockWebsiteUrl}
                  readOnly={!!lockWebsiteUrl}
                  onBlur={(e) => {
                    const sanitized = cleanWebsiteUrlInput(e.target.value)
                    if (sanitized !== field.value) {
                      form.setValue("websiteUrl", sanitized, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    field.onBlur()
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {rightOfWebsite ? (
          <div className="flex flex-col gap-2">{rightOfWebsite}</div>
        ) : null}
      </div>

      <FormField
        name="description"
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Description</FormLabel>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewDesc(false)}
                  className={
                    "px-2 py-1 rounded border " +
                    (!previewDesc ? "bg-muted" : "opacity-60")
                  }
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDesc(true)}
                  className={
                    "px-2 py-1 rounded border " +
                    (previewDesc ? "bg-muted" : "opacity-60")
                  }
                >
                  Preview
                </button>
              </div>
            </div>
            <FormDescription>
              Supports Markdown formatting. Preview changes or revisit the{" "}
              <a
                href="https://www.markdownguide.org/basic-syntax/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Markdown basics
              </a>
              .
            </FormDescription>
            <FormControl>
              {previewDesc ? (
                <div className="h-48 rounded border p-3 overflow-auto prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: (props) => (
                        <a
                          {...props}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        />
                      ),
                    }}
                  >
                    {(form.watch("description") as string) || ""}
                  </ReactMarkdown>
                </div>
              ) : (
                <Textarea
                  rows={10}
                  className="h-48"
                  placeholder="What does your product do?"
                  {...field}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          name="logo"
          control={form.control}
          render={() => (
            <FormItem>
              <ImageUploadField
                name="logo"
                label="Logo"
                folder="logos"
                productId={productId}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="categoryId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="type"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[
                    { v: "saas", l: "SaaS" },
                    { v: "browser_extension", l: "Browser Extension" },
                    { v: "mobile_app", l: "Mobile App" },
                    { v: "desktop_app", l: "Desktop App" },
                    { v: "api", l: "API" },
                    { v: "open_source", l: "Open Source" },
                    { v: "other", l: "Other" },
                  ].map((o) => (
                    <SelectItem key={o.v} value={o.v}>
                      {o.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Keywords (comma separated) */}
        <FormField
          name="keywordsText"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Keywords</FormLabel>
              <FormControl>
                <Input placeholder="comma,separated,keywords" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Platforms */}
      <FormField
        name="platforms"
        control={form.control}
        render={() => (
          <FormItem>
            <FormLabel>Platforms</FormLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {platforms.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={(
                      form.getValues("platforms") as string[]
                    )?.includes(p)}
                    onCheckedChange={(checked) => {
                      const current =
                        (form.getValues("platforms") as string[]) || []
                      const next = checked
                        ? Array.from(new Set([...current, p]))
                        : current.filter((x) => x !== p)
                      form.setValue("platforms", next, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  />
                  <span className="capitalize">{p.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
