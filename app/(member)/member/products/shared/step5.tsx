"use client"

import { useEffect, useMemo, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { X } from "lucide-react"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import { Button } from "@/components/atoms/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Checkbox } from "@/components/atoms/checkbox"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/atoms/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog"
import { ScrollArea } from "@/components/atoms/scroll-area"

type AlternativeOption = {
  id: string
  slug?: string | null
  name: string
  websiteUrl?: string | null
}

function normalizeComparableUrl(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return ""
  try {
    const u = new URL(trimmed)
    const pathname = (u.pathname || "/").replace(/\/+$/g, "") || "/"
    return `${u.origin}${pathname}`
  } catch {
    return trimmed.replace(/\/+$/g, "")
  }
}

function buildDemoSuggestion(websiteUrl: string, path: string) {
  try {
    const u = new URL(websiteUrl.trim())
    u.pathname = path
    u.search = ""
    u.hash = ""
    return u.toString().replace(/\/+$/g, "")
  } catch {
    return ""
  }
}

function normalizeGenericUrl(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  if (trimmed.includes(".") || trimmed.includes("/")) {
    return `https://${trimmed.replace(/^\/+/, "")}`
  }
  return trimmed
}

function normalizeXUrl(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed

  const handle = trimmed.replace(/^@/, "")
  if (/^[A-Za-z0-9_]{1,30}$/.test(handle)) {
    return `https://x.com/${handle}`
  }

  if (trimmed.includes(".") || trimmed.includes("/")) {
    return `https://${trimmed.replace(/^\/+/, "")}`
  }

  return trimmed
}

export default function Step4({
  organizations,
  alternatives = [],
}: {
  organizations: { id: string; name: string }[]
  alternatives?: AlternativeOption[]
}) {
  const form = useFormContext()
  const [alternativeQuery, setAlternativeQuery] = useState("")
  const [alternativesOpen, setAlternativesOpen] = useState(false)
  const [showTracking, setShowTracking] = useState(false)
  const maxAlternatives = 3
  const websiteUrl = useWatch({
    control: form.control,
    name: "websiteUrl" as any,
  }) as string | undefined

  useEffect(() => {
    if (organizations.length !== 1) return
    const current = (form.getValues("organizationId" as any) as string) ?? ""
    if (current) return
    form.setValue("organizationId" as any, organizations[0].id, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    })
  }, [form, organizations])

  const filteredAlternatives = useMemo(() => {
    if (!alternativeQuery.trim()) {
      return alternatives
    }
    const q = alternativeQuery.trim().toLowerCase()
    return alternatives.filter((alt) => {
      return (
        alt.name.toLowerCase().includes(q) ||
        (alt.websiteUrl?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [alternativeQuery, alternatives])

  const alternativeById = useMemo(() => {
    return new Map(alternatives.map((alt) => [alt.id, alt]))
  }, [alternatives])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField
          name="demoUrl"
          control={form.control}
          render={({ field }) => {
            const demoValue = ((field.value as string) ?? "").trim()
            const websiteValue = (websiteUrl ?? "").trim()
            const isSameAsWebsite =
              Boolean(demoValue && websiteValue) &&
              normalizeComparableUrl(demoValue) ===
                normalizeComparableUrl(websiteValue)

            return (
              <FormItem>
                <FormLabel>Demo URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://example.com/demo"
                    {...field}
                    onBlur={(e) => {
                      const raw = e.currentTarget.value ?? ""
                      const trimmed = raw.trim()
                      const normalized =
                        trimmed.startsWith("/") && websiteValue
                          ? buildDemoSuggestion(websiteValue, trimmed)
                          : normalizeGenericUrl(trimmed)
                      if (normalized !== raw) field.onChange(normalized)
                      field.onBlur()
                    }}
                  />
                </FormControl>

                {isSameAsWebsite ? (
                  <p className="pt-2 text-xs text-muted-foreground">
                    Use a specific path like{" "}
                    <span className="font-mono">{websiteValue}/demo</span> or{" "}
                    <span className="font-mono">{websiteValue}/app</span>.
                  </p>
                ) : null}

                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormField
          name="contactEmail"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="support@example.com"
                  {...field}
                  onBlur={(e) => {
                    const raw = e.currentTarget.value ?? ""
                    const next = raw.trim()
                    if (next !== raw) field.onChange(next)
                    field.onBlur()
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="githubUrl"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>GitHub URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="github.com/org/repo"
                  {...field}
                  onBlur={(e) => {
                    const raw = e.currentTarget.value ?? ""
                    const next = normalizeGenericUrl(raw)
                    if (next !== raw) field.onChange(next)
                    field.onBlur()
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="twitterUrl"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>X (Twitter) URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="x.com/yourapp"
                  {...field}
                  onBlur={(e) => {
                    const raw = e.currentTarget.value ?? ""
                    const next = normalizeXUrl(raw)
                    if (next !== raw) field.onChange(next)
                    field.onBlur()
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        name="utmCampaign"
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FormLabel>Tracking</FormLabel>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowTracking((v) => !v)}
              >
                {showTracking || (field.value as string)?.length
                  ? "Hide"
                  : "Add tracking (UTM)"}
              </Button>
            </div>
            {showTracking || (field.value as string)?.length ? (
              <div className="pt-3">
                <FormLabel className="sr-only">UTM Campaign</FormLabel>
                <FormDescription>
                  Appended to outbound links so you can track Shipyard traffic
                  in analytics (e.g. GA/Amplitude).
                </FormDescription>
                <FormControl>
                  <Input placeholder="e.g. shipyard-launch" {...field} />
                </FormControl>
                <FormMessage />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Optional: add a UTM campaign to track clicks from Shipyard.
              </p>
            )}
          </FormItem>
        )}
      />

      <FormField
        name="alternativeIds"
        control={form.control}
        render={({ field }) => {
          const selectedIds = Array.isArray(field.value) ? field.value : []
          const selectedSet = new Set(selectedIds)
          const selectedAlternatives = selectedIds
            .map((id) => alternativeById.get(id))
            .filter(Boolean) as AlternativeOption[]
          const pinnedFiltered = [
            ...selectedAlternatives,
            ...filteredAlternatives.filter((alt) => !selectedSet.has(alt.id)),
          ]
          return (
            <FormItem>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FormLabel>Positioning</FormLabel>
                    <Badge>Recommended</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Alternatives: {selectedIds.length}/{maxAlternatives}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Show up on alternative searches and comparison pages.
                </p>
              </div>

              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {selectedIds.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedIds.map((id) => {
                        const alt = alternativeById.get(id)
                        const label = alt?.name ?? "Selected product"
                        return (
                          <button
                            key={id}
                            type="button"
                            className="inline-flex cursor-pointer items-center gap-1 rounded-full border bg-muted/20 px-3 py-1 text-xs text-foreground hover:bg-muted/40"
                            onClick={() => {
                              const next = selectedIds.filter((x) => x !== id)
                              field.onChange(next)
                            }}
                            title="Remove"
                          >
                            <span className="max-w-[14rem] truncate">
                              {label}
                            </span>
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Pick up to {maxAlternatives} products you replace or
                      compete with.
                    </p>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAlternativesOpen(true)}
                    disabled={!alternatives.length}
                  >
                    Choose
                  </Button>
                </div>

                {!alternatives.length ? (
                  <p className="text-xs text-muted-foreground">
                    No alternatives available yet. Ask an admin to add them from
                    the catalog.
                  </p>
                ) : null}
              </div>

              <Dialog
                open={alternativesOpen}
                onOpenChange={(open) => {
                  setAlternativesOpen(open)
                  if (!open) setAlternativeQuery("")
                }}
              >
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Choose alternatives</DialogTitle>
                    <DialogDescription>
                      Select up to {maxAlternatives}. These show on alternative
                      searches and comparisons.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3">
                    <Input
                      value={alternativeQuery}
                      onChange={(event) =>
                        setAlternativeQuery(event.target.value)
                      }
                      placeholder="Search by name or URL"
                    />

                    <ScrollArea className="max-h-[320px] rounded-md border border-dashed border-border/60">
                      <div className="p-2">
                        {pinnedFiltered.length === 0 ? (
                          <p className="px-2 py-6 text-sm text-muted-foreground">
                            No alternatives match your search.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {pinnedFiltered.map((alternative) => {
                              const isSelected = selectedSet.has(alternative.id)
                              const atLimit =
                                selectedSet.size >= maxAlternatives &&
                                !isSelected
                              return (
                                <label
                                  key={alternative.id}
                                  className={cn(
                                    "flex cursor-pointer items-start justify-between gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-muted/40",
                                    isSelected && "bg-muted/40",
                                    atLimit && "cursor-not-allowed opacity-60",
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      checked={isSelected}
                                      disabled={atLimit}
                                      onCheckedChange={(checked) => {
                                        const next = new Set(selectedSet)
                                        if (checked) next.add(alternative.id)
                                        else next.delete(alternative.id)
                                        field.onChange(Array.from(next))
                                      }}
                                    />
                                    <div className="min-w-0">
                                      <div className="font-medium">
                                        {alternative.name}
                                      </div>
                                      {alternative.websiteUrl ? (
                                        <div className="text-xs text-muted-foreground">
                                          {alternative.websiteUrl}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                  {isSelected ? (
                                    <Badge variant="secondary">Selected</Badge>
                                  ) : null}
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        Selected: {selectedSet.size}/{maxAlternatives}
                      </span>
                      <Button
                        type="button"
                        onClick={() => setAlternativesOpen(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <FormMessage />
            </FormItem>
          )
        }}
      />

      {organizations.length ? (
        <FormField
          name="organizationId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Publish under organization</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                value={(field.value as string) ?? ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No organization</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        Skip now — you can edit these anytime.
      </p>
    </div>
  )
}
