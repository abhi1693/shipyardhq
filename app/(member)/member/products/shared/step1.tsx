"use client"

import { useFormContext } from "react-hook-form"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select"
import { Checkbox } from "@/components/atoms/checkbox"

type Props = {
  categories: { id: string; name: string }[]
  platforms: readonly string[]
}

export default function Step1({ categories, platforms }: Props) {
  const form = useFormContext()
  const [previewDesc, setPreviewDesc] = useState(false)

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
              <FormLabel>Website URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  className={"px-2 py-1 rounded border " + (!previewDesc ? "bg-muted" : "opacity-60")}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDesc(true)}
                  className={"px-2 py-1 rounded border " + (previewDesc ? "bg-muted" : "opacity-60")}
                >
                  Preview
                </button>
              </div>
            </div>
            <FormControl>
              {previewDesc ? (
                <div className="h-48 rounded border p-3 overflow-auto prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => (
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
                  placeholder="What does your product do? Use markdown for formatting (headings, lists, links)."
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/logo.png" {...field} />
              </FormControl>
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
                    checked={(form.getValues("platforms") as string[])?.includes(p)}
                    onCheckedChange={(checked) => {
                      const current = (form.getValues("platforms") as string[]) || []
                      const next = checked
                        ? Array.from(new Set([...current, p]))
                        : current.filter((x) => x !== p)
                      form.setValue("platforms", next, { shouldDirty: true, shouldValidate: true })
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

