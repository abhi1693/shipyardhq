"use client"

import { useFormContext, useWatch } from "react-hook-form"
import { ReactNode, useEffect, useMemo, useState } from "react"
import {
  Globe,
  Code,
  Laptop,
  Info,
  Monitor,
  Puzzle,
  Smartphone,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
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
import { MarkdownEditor } from "@/components/molecules/MarkdownEditor"
import { SearchableSelect } from "@/components/molecules/SearchableSelect"
import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { KeywordsInput } from "@/components/molecules/KeywordsInput"

const PLATFORM_LABELS: Record<string, string> = {
  web: "Web",
  ios: "iOS",
  android: "Android",
  mac: "Mac",
  windows: "Windows",
  linux: "Linux",
  chrome_extension: "Chrome Extension",
  firefox_extension: "Firefox Extension",
}

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  web: Globe,
  ios: Smartphone,
  android: Smartphone,
  mac: Laptop,
  windows: Monitor,
  linux: Terminal,
  chrome_extension: Puzzle,
  firefox_extension: Puzzle,
}

const PRODUCT_TYPE_OPTIONS: { v: string; l: string; Icon: LucideIcon }[] = [
  { v: "saas", l: "SaaS", Icon: Globe },
  { v: "browser_extension", l: "Browser Extension", Icon: Puzzle },
  { v: "mobile_app", l: "Mobile App", Icon: Smartphone },
  { v: "desktop_app", l: "Desktop App", Icon: Monitor },
  { v: "api", l: "API", Icon: Terminal },
  { v: "open_source", l: "Open Source", Icon: Code },
  { v: "other", l: "Other", Icon: Globe },
]

const NAME_MAX_CHARS = 60
const TAGLINE_MAX_CHARS = 90
const TAGLINE_RECOMMENDED_MIN = 40
const TAGLINE_RECOMMENDED_MAX = 70

const INFO_TRIGGER_CLASS =
  "inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

type Props = {
  categories: { id: string; name: string; icon?: string | null }[]
  platforms: readonly string[]
  lockWebsiteUrl?: boolean
  rightOfWebsite?: ReactNode
  enableAutofill?: boolean
  autofillNotice?: ReactNode
}

export default function Step1({
  categories,
  platforms,
  lockWebsiteUrl,
  rightOfWebsite,
  enableAutofill,
  autofillNotice,
}: Props) {
  const form = useFormContext()
  const [autofilling, setAutofilling] = useState(false)
  const productType = useWatch({
    control: form.control,
    name: "type",
  }) as string | undefined
  const selectedPlatforms = useWatch({
    control: form.control,
    name: "platforms",
  }) as string[] | undefined

  const allowedPlatforms = useMemo(() => {
    switch (productType) {
      case "saas":
        return null
      case "browser_extension":
        return new Set<string>(["chrome_extension", "firefox_extension"])
      case "mobile_app":
        return new Set<string>(["ios", "android"])
      case "desktop_app":
        return new Set<string>(["mac", "windows", "linux"])
      case "api":
        return new Set<string>(["web"])
      case "open_source":
      case "other":
      default:
        return null
    }
  }, [productType])

  const visiblePlatforms = useMemo(() => {
    if (!allowedPlatforms) return platforms
    return platforms.filter((p) => allowedPlatforms.has(p))
  }, [allowedPlatforms, platforms])

  const categoryOptions = useMemo(() => {
    return categories.map((c) => ({
      value: c.id,
      label: c.name,
      icon: <CategoryIcon icon={c.icon ?? null} size={16} />,
    }))
  }, [categories])

  useEffect(() => {
    if (!allowedPlatforms) return
    const current = Array.isArray(selectedPlatforms) ? selectedPlatforms : []
    const next = current.filter((p) => allowedPlatforms.has(p))
    if (next.length !== current.length) {
      form.setValue("platforms", next, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [allowedPlatforms, form, selectedPlatforms])

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
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white/80 p-4 sm:p-5">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              name="websiteUrl"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-3">
                    <FormLabel className="flex items-center gap-2">
                      Website URL
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={INFO_TRIGGER_CLASS}
                            aria-label="Why we ask for your website URL"
                          >
                            <Info className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                          Used for autofill and ownership verification.
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                  </div>
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
              <div className="flex flex-col justify-end gap-2">
                {rightOfWebsite}
              </div>
            ) : null}
          </div>

          {enableAutofill ? (
            <div className="border-t pt-6">
              <div className="rounded-lg border border-dashed border-[color:var(--brand-1)/0.35] bg-[color:var(--brand-1)/0.05] p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 text-left">
                    <span className="mt-0.5 rounded-full bg-[color:var(--brand-1)/0.12] p-2 text-[color:var(--brand-1)]">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        <span className="inline-flex items-center gap-2">
                          Run AI Autofill
                          {autofillNotice ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className={INFO_TRIGGER_CLASS}
                                  aria-label="AI Autofill notice"
                                >
                                  <Info
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={6}>
                                {autofillNotice}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Draft name, tagline, and description from your website.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={handleAutofill}
                    disabled={autofilling}
                  >
                    <Sparkles className="h-4 w-4" />
                    {autofilling ? "AI autofilling…" : "Run AI Autofill"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="border-t pt-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-end justify-between gap-3">
                      <FormLabel className="flex items-center gap-2">
                        Name
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={INFO_TRIGGER_CLASS}
                              aria-label="Name guidance"
                            >
                              <Info className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            Keep it short and recognizable (max {NAME_MAX_CHARS}).
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {(typeof field.value === "string" ? field.value : "").length}/
                        {NAME_MAX_CHARS}
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        ref={field.ref}
                        name={field.name}
                        placeholder="Enter product name"
                        maxLength={NAME_MAX_CHARS}
                        value={(field.value as string) ?? ""}
                        onChange={(e) => {
                          form.clearErrors(field.name)
                          form.setValue(field.name, e.target.value, {
                            shouldDirty: true,
                            shouldValidate: false,
                          })
                        }}
                        onBlur={field.onBlur}
                      />
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
                    <div className="flex items-end justify-between gap-3">
                      <FormLabel className="flex items-center gap-2">
                        Tagline
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={INFO_TRIGGER_CLASS}
                              aria-label="Tagline guidance"
                            >
                              <Info className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            Recommended {TAGLINE_RECOMMENDED_MIN}–{TAGLINE_RECOMMENDED_MAX}{" "}
                            characters (max {TAGLINE_MAX_CHARS}).
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {(typeof field.value === "string" ? field.value : "").length}/
                        {TAGLINE_MAX_CHARS}
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        ref={field.ref}
                        name={field.name}
                        placeholder="Short tagline"
                        maxLength={TAGLINE_MAX_CHARS}
                        value={(field.value as string) ?? ""}
                        onChange={(e) => {
                          form.clearErrors(field.name)
                          form.setValue(field.name, e.target.value, {
                            shouldDirty: true,
                            shouldValidate: false,
                          })
                        }}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white/80 p-4 sm:p-5">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              name="categoryId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={categoryOptions}
                      placeholder="Select category"
                      title="Choose a category"
                      description="Start typing to filter categories."
                      searchPlaceholder="Search categories…"
                      emptyText="No categories match your search."
                    />
                  </FormControl>
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
                        {(() => {
                          const selected = PRODUCT_TYPE_OPTIONS.find(
                            (o) => o.v === field.value,
                          )
                          if (!selected) {
                            return <SelectValue placeholder="Select type" />
                          }
                          const Icon = selected.Icon
                          return (
                            <SelectValue placeholder="Select type">
                              <Icon
                                className="h-4 w-4 text-muted-foreground"
                                aria-hidden="true"
                              />
                              <span>{selected.l}</span>
                            </SelectValue>
                          )
                        })()}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRODUCT_TYPE_OPTIONS.map(({ v, l, Icon }) => (
                        <SelectItem
                          key={v}
                          value={v}
                          icon={<Icon className="h-4 w-4 text-muted-foreground" />}
                        >
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {productType ? (
            <FormField
              name="platforms"
              control={form.control}
              render={() => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Platforms
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={INFO_TRIGGER_CLASS}
                          aria-label="Platform guidance"
                        >
                          <Info className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6}>
                        Select all that apply. Options may be filtered by product type.
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <div
                    className={[
                      "grid gap-3",
                      "grid-cols-2",
                      visiblePlatforms.length === 1
                        ? "md:grid-cols-1"
                        : visiblePlatforms.length === 2
                          ? "md:grid-cols-2"
                          : visiblePlatforms.length === 3
                            ? "md:grid-cols-3"
                            : "md:grid-cols-4",
                    ].join(" ")}
                  >
                    {visiblePlatforms.map((p) => {
                      const Icon = PLATFORM_ICONS[p] ?? Globe
                      const label =
                        PLATFORM_LABELS[p] ??
                        p
                          .replace(/_/g, " ")
                          .replace(/^\w/, (c) => c.toUpperCase())
                      const isChecked = (selectedPlatforms ?? [])?.includes(p)

                      return (
                        <label
                          key={p}
                          className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border bg-background p-2 text-sm transition-colors hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const current = Array.isArray(selectedPlatforms)
                                ? selectedPlatforms
                                : []
                              const next = checked
                                ? Array.from(new Set([...current, p]))
                                : current.filter((x) => x !== p)
                              form.setValue("platforms", next, {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                            }}
                          />
                          <Icon
                            className="h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="min-w-0 flex-1 truncate whitespace-nowrap">
                                {label}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={6}>
                              {label}
                            </TooltipContent>
                          </Tooltip>
                        </label>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="rounded-lg border bg-muted/10 p-3 text-sm text-muted-foreground">
              Select a product type to choose platforms.
            </div>
          )}

          <FormField
            name="keywordsText"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Keywords
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={INFO_TRIGGER_CLASS}
                        aria-label="Keyword guidance"
                      >
                        <Info className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      Helps people find your product in search. Recommended: 3–8 keywords.
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>
                <FormControl>
                  <KeywordsInput
                    value={(field.value as string) ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="border-t pt-6">
            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Description
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={INFO_TRIGGER_CLASS}
                          aria-label="Description guidance"
                        >
                          <Info className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6}>
                        Markdown supported. Use headings like ## / ###.{" "}
                        <a
                          href="https://www.markdownguide.org/basic-syntax/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Markdown basics
                        </a>
                        .
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  <FormControl>
                    <MarkdownEditor
                      ref={field.ref}
                      value={(field.value as string) ?? ""}
                      onChange={(val) => field.onChange(val)}
                      onBlur={field.onBlur}
                      name={field.name}
                      placeholder="What does your product do?"
                      rows={10}
                      textareaClassName="h-48"
                      previewClassName="h-48"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
