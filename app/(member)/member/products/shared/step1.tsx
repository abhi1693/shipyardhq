"use client"

import { useFormContext, useWatch } from "react-hook-form"
import { ReactNode, useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  Check,
  Globe,
  Code,
  FileText,
  Laptop,
  Info,
  Monitor,
  Puzzle,
  Search,
  Smartphone,
  Sparkles,
  Tags,
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
import { CategoryIcon } from "@/components/molecules/CategoryIcons"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/atoms/tooltip"
import { KeywordsInput } from "@/components/molecules/KeywordsInput"
import { DraftFormSection } from "@/components/pages/products/_components/DraftFormSection"
import { PRODUCT_WIZARD_DROPDOWN_TRIGGER_CLASS } from "@/components/pages/products/_shared/dropdownStyles"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog"
import { ScrollArea } from "@/components/atoms/scroll-area"

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
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false)
  const [categoryQuery, setCategoryQuery] = useState("")
  const productType = useWatch({
    control: form.control,
    name: "type",
  }) as string | undefined
  const selectedPlatforms = useWatch({
    control: form.control,
    name: "platforms",
  }) as string[] | undefined
  const primaryCategoryId = useWatch({
    control: form.control,
    name: "categoryId",
  }) as string | undefined
  const selectedCategoryIdsRaw = useWatch({
    control: form.control,
    name: "categoryIds",
  }) as string[] | undefined
  const selectedCategoryIds = useMemo(() => {
    if (
      Array.isArray(selectedCategoryIdsRaw) &&
      selectedCategoryIdsRaw.length
    ) {
      return selectedCategoryIdsRaw
    }
    return primaryCategoryId ? [primaryCategoryId] : []
  }, [primaryCategoryId, selectedCategoryIdsRaw])
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )
  const selectedCategories = useMemo(
    () =>
      selectedCategoryIds
        .map((categoryId) => categoryById.get(categoryId))
        .filter(
          (
            category,
          ): category is { id: string; name: string; icon?: string | null } =>
            Boolean(category),
        ),
    [categoryById, selectedCategoryIds],
  )
  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((category) =>
      category.name.toLowerCase().includes(q),
    )
  }, [categories, categoryQuery])

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

  useEffect(() => {
    if (selectedCategoryIdsRaw?.length || !primaryCategoryId) return
    form.setValue("categoryIds", [primaryCategoryId], {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [form, primaryCategoryId, selectedCategoryIdsRaw?.length])

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

    const suggestedCategoryNames = [
      ...(suggestion.categoryNames ?? []),
      suggestion.categoryName,
    ].filter((name): name is string => Boolean(name?.trim()))

    if (suggestedCategoryNames.length) {
      const matchedIds = suggestedCategoryNames
        .map((name) => {
          const lower = name.toLowerCase()
          return (
            categories.find((c) => c.name.toLowerCase() === lower) ||
            categories.find((c) => lower.includes(c.name.toLowerCase())) ||
            categories.find((c) => c.name.toLowerCase().includes(lower))
          )
        })
        .filter(
          (
            category,
          ): category is { id: string; name: string; icon?: string | null } =>
            Boolean(category),
        )
        .map((category) => category.id)

      if (matchedIds.length) {
        const current = Array.isArray(form.getValues("categoryIds"))
          ? (form.getValues("categoryIds") as string[])
          : []
        const next = Array.from(new Set([...matchedIds, ...current])).slice(
          0,
          3,
        )
        form.setValue("categoryId", next[0] ?? "", {
          shouldDirty: true,
          shouldValidate: true,
        })
        form.setValue("categoryIds", next, {
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

    if (suggestion.videoUrl) {
      form.setValue("videoUrl", suggestion.videoUrl, {
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
      <DraftFormSection
        title="Website URL & Identity"
        description="Connect the landing page and define the product identity."
        icon={Globe}
      >
        <div className="space-y-6">
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
                <div className="flex flex-col gap-2 md:flex-row">
                  <div className="relative flex-1">
                    <Globe
                      className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[#C4C6CD]"
                      aria-hidden="true"
                    />
                    <FormControl>
                      <Input
                        className="pl-10"
                        placeholder="https://yourproduct.com"
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
                  </div>
                  {enableAutofill ? (
                    <Button
                      type="button"
                      className="h-12 shrink-0 rounded-lg bg-black px-6 text-[12px] font-bold uppercase tracking-[0.05em] text-white hover:bg-black/90"
                      onClick={handleAutofill}
                      disabled={autofilling}
                    >
                      <Sparkles className="size-5" aria-hidden="true" />
                      {autofilling ? "Analyzing..." : "Run AI Autofill"}
                      {autofillNotice ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="inline-flex size-5 items-center justify-center rounded-sm text-white/80"
                              aria-label="AI Autofill notice"
                            >
                              <Info
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            {autofillNotice}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </Button>
                  ) : null}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {rightOfWebsite ? (
            <div className="max-w-xl">{rightOfWebsite}</div>
          ) : null}

          <div className="border-t border-[#E2E8F0] pt-6">
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
                              <Info
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            Keep it short and recognizable (max {NAME_MAX_CHARS}
                            ).
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {
                          (typeof field.value === "string" ? field.value : "")
                            .length
                        }
                        /{NAME_MAX_CHARS}
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
                              <Info
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            Recommended {TAGLINE_RECOMMENDED_MIN}–
                            {TAGLINE_RECOMMENDED_MAX} characters (max{" "}
                            {TAGLINE_MAX_CHARS}).
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {
                          (typeof field.value === "string" ? field.value : "")
                            .length
                        }
                        /{TAGLINE_MAX_CHARS}
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
      </DraftFormSection>

      <DraftFormSection
        title="Categorization & Deployment"
        description="Classify where the product belongs and which platforms it supports."
        icon={Tags}
        accent="secondary"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              name="categoryIds"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-end justify-between gap-3">
                    <FormLabel>Categories</FormLabel>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {selectedCategoryIds.length}/3
                    </span>
                  </div>
                  <div className="space-y-3">
                    <button
                      type="button"
                      className={`${PRODUCT_WIZARD_DROPDOWN_TRIGGER_CLASS} flex items-center justify-between gap-3 text-left focus-visible:outline-none`}
                      onClick={() => setCategoryPickerOpen(true)}
                      aria-haspopup="dialog"
                      aria-expanded={categoryPickerOpen}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <Tags
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {selectedCategories.length
                            ? selectedCategories
                                .map((category) => category.name)
                                .join(", ")
                            : "Search and select up to 3 categories"}
                        </span>
                      </span>
                      <ChevronDown
                        className="size-4 shrink-0 text-[#74777d]"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  <Dialog
                    open={categoryPickerOpen}
                    onOpenChange={(next) => {
                      setCategoryPickerOpen(next)
                      if (!next) setCategoryQuery("")
                    }}
                  >
                    <DialogContent className="p-0 sm:max-w-md">
                      <div className="p-6 pb-3">
                        <DialogHeader>
                          <DialogTitle>Select categories</DialogTitle>
                        </DialogHeader>
                      </div>

                      <div className="border-t px-6 py-3">
                        <div className="relative">
                          <Search
                            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#74777d]"
                            aria-hidden="true"
                          />
                          <Input
                            value={categoryQuery}
                            onChange={(e) => setCategoryQuery(e.target.value)}
                            placeholder="Search categories..."
                            className="pl-9"
                            autoFocus
                          />
                        </div>
                      </div>

                      <ScrollArea className="max-h-[320px] border-t">
                        <div className="p-2">
                          {filteredCategories.length ? (
                            filteredCategories.map((category) => {
                              const checked = selectedCategoryIds.includes(
                                category.id,
                              )
                              const atLimit =
                                selectedCategoryIds.length >= 3 && !checked

                              return (
                                <button
                                  key={category.id}
                                  type="button"
                                  disabled={atLimit}
                                  className={[
                                    "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                                    checked
                                      ? "bg-[#eff4ff] text-black"
                                      : "text-[#43474c] hover:bg-[#F8FAFC]",
                                    atLimit
                                      ? "cursor-not-allowed opacity-45"
                                      : "cursor-pointer",
                                  ].join(" ")}
                                  onClick={() => {
                                    const next = checked
                                      ? selectedCategoryIds.filter(
                                          (id) => id !== category.id,
                                        )
                                      : Array.from(
                                          new Set([
                                            ...selectedCategoryIds,
                                            category.id,
                                          ]),
                                        ).slice(0, 3)
                                    field.onChange(next)
                                    form.setValue("categoryId", next[0] ?? "", {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    })
                                  }}
                                >
                                  <span className="flex min-w-0 items-center gap-3">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded bg-[#eff4ff] text-[#0051d5]">
                                      <CategoryIcon
                                        icon={category.icon ?? null}
                                        size={16}
                                      />
                                    </span>
                                    <span className="truncate font-semibold">
                                      {category.name}
                                    </span>
                                  </span>
                                  {checked ? (
                                    <Check
                                      className="size-4 shrink-0 text-[#0051d5]"
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                </button>
                              )
                            })
                          ) : (
                            <div className="px-3 py-8 text-center text-sm text-[#74777d]">
                              No categories found.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
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
                      <SelectTrigger
                        className={PRODUCT_WIZARD_DROPDOWN_TRIGGER_CLASS}
                      >
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
                          icon={
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          }
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
                        Select all that apply. Options may be filtered by
                        product type.
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
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm text-[#43474c]">
              Select a product type to choose platforms.
            </div>
          )}
        </div>
      </DraftFormSection>

      <DraftFormSection
        title="Content & Metadata"
        description="Define search keywords and the launch narrative."
        icon={FileText}
        accent="orange"
      >
        <div className="space-y-6">
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
                      Helps people find your product in search. Recommended: 3–8
                      keywords.
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

          <div className="border-t border-[#E2E8F0] pt-6">
            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem>
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
                      toolbarLeft={
                        <FormLabel className="flex items-center gap-2">
                          Description
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className={INFO_TRIGGER_CLASS}
                                aria-label="Description guidance"
                              >
                                <Info
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
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
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </DraftFormSection>
    </div>
  )
}
