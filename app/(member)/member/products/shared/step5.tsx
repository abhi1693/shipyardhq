"use client"

import { useMemo, useState } from "react"
import { useFormContext } from "react-hook-form"
import { Check, ChevronDown, Link2, Search, Target } from "lucide-react"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog"
import { ScrollArea } from "@/components/atoms/scroll-area"
import { DraftFormSection } from "@/components/pages/products/_components/DraftFormSection"
import { PRODUCT_WIZARD_DROPDOWN_TRIGGER_CLASS } from "@/components/pages/products/_shared/dropdownStyles"

type AlternativeOption = {
  id: string
  slug?: string | null
  name: string
  websiteUrl?: string | null
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
  alternatives = [],
}: {
  alternatives?: AlternativeOption[]
}) {
  const form = useFormContext()
  const [alternativeQuery, setAlternativeQuery] = useState("")
  const [alternativesOpen, setAlternativesOpen] = useState(false)
  const [showTracking, setShowTracking] = useState(false)
  const maxAlternatives = 3

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
      <DraftFormSection
        title="Launch Links"
        description="Add the operational URLs users and reviewers need."
        icon={Link2}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
      </DraftFormSection>

      <DraftFormSection
        title="Positioning"
        description="Attach campaign tracking and alternative comparisons."
        icon={Target}
        accent="secondary"
      >
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

        <div className="mt-6 border-t border-[#E2E8F0] pt-6">
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
                ...filteredAlternatives.filter(
                  (alt) => !selectedSet.has(alt.id),
                ),
              ]
              return (
                <FormItem>
                  <div className="space-y-1">
                    <div className="flex items-end justify-between gap-3">
                      <FormLabel>Positioning</FormLabel>
                      <span className="text-xs text-muted-foreground">
                        {selectedIds.length}/{maxAlternatives}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Show up on alternative searches and comparison pages.
                    </p>
                  </div>

                  <div className="mt-3 space-y-3">
                    <button
                      type="button"
                      className={`${PRODUCT_WIZARD_DROPDOWN_TRIGGER_CLASS} flex items-center justify-between gap-3 text-left focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50`}
                      onClick={() => setAlternativesOpen(true)}
                      disabled={!alternatives.length}
                      aria-haspopup="dialog"
                      aria-expanded={alternativesOpen}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <Target
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {selectedAlternatives.length
                            ? selectedAlternatives
                                .map((alternative) => alternative.name)
                                .join(", ")
                            : "Search and select up to 3 alternatives"}
                        </span>
                      </span>
                      <ChevronDown
                        className="size-4 shrink-0 text-[#74777d]"
                        aria-hidden="true"
                      />
                    </button>

                    {!alternatives.length ? (
                      <p className="text-xs text-muted-foreground">
                        No alternatives available yet. Check back after the
                        catalog has more products.
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
                    <DialogContent className="p-0 sm:max-w-md">
                      <div className="p-6 pb-3">
                        <DialogHeader>
                          <DialogTitle>Select alternatives</DialogTitle>
                        </DialogHeader>
                      </div>

                      <div className="border-t px-6 py-3">
                        <div className="relative">
                          <Search
                            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#74777d]"
                            aria-hidden="true"
                          />
                          <Input
                            value={alternativeQuery}
                            onChange={(event) =>
                              setAlternativeQuery(event.target.value)
                            }
                            placeholder="Search alternatives..."
                            className="pl-9"
                            autoFocus
                          />
                        </div>
                      </div>

                      <ScrollArea className="max-h-[320px] border-t">
                        <div className="p-2">
                          {pinnedFiltered.length === 0 ? (
                            <div className="px-3 py-8 text-center text-sm text-[#74777d]">
                              No alternatives found.
                            </div>
                          ) : (
                            pinnedFiltered.map((alternative) => {
                              const isSelected = selectedSet.has(alternative.id)
                              const atLimit =
                                selectedSet.size >= maxAlternatives &&
                                !isSelected
                              return (
                                <button
                                  key={alternative.id}
                                  type="button"
                                  disabled={atLimit}
                                  className={[
                                    "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                                    isSelected
                                      ? "bg-[#eff4ff] text-black"
                                      : "text-[#43474c] hover:bg-[#F8FAFC]",
                                    atLimit
                                      ? "cursor-not-allowed opacity-45"
                                      : "cursor-pointer",
                                  ].join(" ")}
                                  onClick={() => {
                                    const next = isSelected
                                      ? selectedIds.filter(
                                          (id) => id !== alternative.id,
                                        )
                                      : Array.from(
                                          new Set([
                                            ...selectedIds,
                                            alternative.id,
                                          ]),
                                        ).slice(0, maxAlternatives)
                                    field.onChange(next)
                                  }}
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate font-semibold">
                                      {alternative.name}
                                    </span>
                                    {alternative.websiteUrl ? (
                                      <span className="block truncate text-xs text-[#74777d]">
                                        {alternative.websiteUrl}
                                      </span>
                                    ) : null}
                                  </span>
                                  {isSelected ? (
                                    <Check
                                      className="size-4 shrink-0 text-[#0051d5]"
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>

                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>
      </DraftFormSection>
    </div>
  )
}
