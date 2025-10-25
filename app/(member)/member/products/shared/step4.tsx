"use client"

import { useMemo, useState } from "react"
import { useFormContext } from "react-hook-form"
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormControl,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import ImageUploadField from "@/components/molecules/ImageUploadField"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { MEMBER_ORGANIZATIONS_PATH } from "@/lib/routes"
import { Checkbox } from "@/components/atoms/checkbox"
import { cn } from "@/lib/utils"

type AlternativeOption = {
  id: string
  name: string
  websiteUrl?: string | null
}

export default function Step4({
  organizations,
  productId,
  canEditCTA = true,
  alternatives = [],
}: {
  organizations: { id: string; name: string }[]
  productId?: string
  canEditCTA?: boolean
  alternatives?: AlternativeOption[]
}) {
  const form = useFormContext()
  const [alternativeQuery, setAlternativeQuery] = useState("")

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          name="organizationId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Organization</FormLabel>
                <a
                  href={MEMBER_ORGANIZATIONS_PATH}
                  className="text-xs text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Manage organizations
                </a>
              </div>
              <Select
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                value={field.value && field.value.length ? field.value : "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Personal</SelectItem>
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
        <FormField
          name="bannerImage"
          control={form.control}
          render={() => (
            <FormItem>
              <ImageUploadField
                name="bannerImage"
                label="Banner Image"
                folder="banners"
                productId={productId}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recommended size: 1200×628 (≈1.91:1 aspect). Larger images will
                be scaled to fit.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="ctaLabel"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CTA Label</FormLabel>
              <FormControl>
                <Input
                  placeholder="Try it free"
                  {...field}
                  disabled={!canEditCTA}
                  readOnly={!canEditCTA}
                />
              </FormControl>
              {!canEditCTA ? (
                <p className="text-xs text-muted-foreground">
                  Custom CTA is available on plans with the CTA feature.
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="ctaUrl"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CTA URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/signup"
                  {...field}
                  disabled={!canEditCTA}
                  readOnly={!canEditCTA}
                />
              </FormControl>
              {!canEditCTA ? (
                <p className="text-xs text-muted-foreground">
                  Purchase a plan with Custom CTA to edit this.
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          name="githubUrl"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>GitHub URL</FormLabel>
              <FormControl>
                <Input placeholder="https://github.com/org/repo" {...field} />
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
              <FormLabel>Twitter URL</FormLabel>
              <FormControl>
                <Input placeholder="https://twitter.com/yourapp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="demoUrl"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Demo URL</FormLabel>
              <FormControl>
                <Input placeholder="https://demo.example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="contactEmail"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Email</FormLabel>
              <FormControl>
                <Input placeholder="support@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="utmCampaign"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>UTM Campaign (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. product-summer-promo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        name="alternativeIds"
        control={form.control}
        render={({ field }) => {
          const selectedIds = Array.isArray(field.value) ? field.value : []
          return (
            <FormItem>
              <FormLabel>Competitive alternatives</FormLabel>
              <FormDescription>
                Connect your product to well-known tools that customers compare
                against. This helps Shipyard surface better side-by-side
                insights.
              </FormDescription>
              <div className="mt-3 space-y-3">
                <Input
                  value={alternativeQuery}
                  onChange={(event) => setAlternativeQuery(event.target.value)}
                  placeholder="Search alternatives by name or URL"
                  className="md:w-80"
                />
                <div className="max-h-64 overflow-y-auto rounded-md border border-dashed border-border/60 p-3">
                  {filteredAlternatives.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {alternatives.length
                        ? "No alternatives match your search."
                        : "No alternatives available yet. Ask an admin to add them from the catalog."}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredAlternatives.map((alternative) => {
                        const isSelected = selectedIds.includes(alternative.id)
                        return (
                          <label
                            key={alternative.id}
                            className={cn(
                              "flex cursor-pointer items-center justify-between rounded-md border border-transparent px-3 py-2 text-sm transition",
                              isSelected
                                ? "bg-primary/10 text-primary"
                                : "hover:border-border hover:bg-muted/50",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const next = new Set(selectedIds)
                                  if (checked) {
                                    next.add(alternative.id)
                                  } else {
                                    next.delete(alternative.id)
                                  }
                                  field.onChange(Array.from(next))
                                }}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {alternative.name}
                                </span>
                                {alternative.websiteUrl ? (
                                  <span className="text-xs text-muted-foreground">
                                    {alternative.websiteUrl}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )
        }}
      />
    </div>
  )
}
