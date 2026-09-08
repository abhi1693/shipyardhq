"use client"

import { useState } from "react"

import { Input } from "@/components/atoms/input"
import { Textarea } from "@/components/atoms/textarea"
import { wrapJsonLdInScriptTag } from "@/lib/tools/generators"

import {
  CopyableCode,
  ToolField,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "./ToolWorkspaceUi"

type SchemaType =
  | "Organization"
  | "Article"
  | "Product"
  | "FAQPage"
  | "HowTo"
  | "LocalBusiness"
  | "Event"
  | "BreadcrumbList"
  | "JobPosting"

const TYPES: { value: SchemaType; label: string; helper: string }[] = [
  {
    value: "Organization",
    label: "Organization",
    helper: "Company or project identity",
  },
  { value: "Article", label: "Article", helper: "Editorial or guide page" },
  { value: "Product", label: "Product", helper: "Product with an offer" },
  { value: "FAQPage", label: "FAQ", helper: "Visible questions and answers" },
  { value: "HowTo", label: "How-to", helper: "Ordered instructions" },
  {
    value: "LocalBusiness",
    label: "Local business",
    helper: "Public location and phone",
  },
  { value: "Event", label: "Event", helper: "Dated online or physical event" },
  { value: "BreadcrumbList", label: "Breadcrumbs", helper: "Page hierarchy" },
  { value: "JobPosting", label: "Job posting", helper: "Public open role" },
]

type Values = Record<string, string>

const DEFAULTS: Values = {
  name: "Shipyard",
  description: "A place to discover and launch outstanding products.",
  url: "https://shipyardhq.dev/",
  image: "https://shipyardhq.dev/opengraph-image.png",
  secondary: "",
  tertiary: "",
  items:
    "What is Shipyard? | A place to discover and launch products.\nIs it free? | Browsing and the SEO tools are free.",
}

function compact<T extends Record<string, unknown>>(object: T): T {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) =>
        value !== "" &&
        value !== undefined &&
        (!Array.isArray(value) || value.length),
    ),
  ) as T
}

function lines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildSchema(type: SchemaType, values: Values) {
  const base = {
    "@context": "https://schema.org",
    "@type": type,
    name: values.name.trim(),
    description: values.description.trim(),
    url: values.url.trim(),
    image: values.image.trim(),
  }
  if (type === "Organization")
    return compact({
      ...base,
      logo: values.image.trim(),
      sameAs: lines(values.items),
    })
  if (type === "Article")
    return compact({
      ...base,
      headline: values.name.trim(),
      datePublished: values.secondary,
      dateModified: values.tertiary,
      author: values.items.trim()
        ? { "@type": "Person", name: values.items.trim() }
        : undefined,
    })
  if (type === "Product")
    return compact({
      ...base,
      sku: values.secondary,
      brand: values.tertiary
        ? { "@type": "Brand", name: values.tertiary }
        : undefined,
      offers: values.items.trim()
        ? {
            "@type": "Offer",
            price: values.items.trim(),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: values.url.trim(),
          }
        : undefined,
    })
  if (type === "FAQPage")
    return compact({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: lines(values.items).flatMap((line) => {
        const [question, ...answers] = line.split("|")
        const answer = answers.join("|").trim()
        return question?.trim() && answer
          ? [
              {
                "@type": "Question",
                name: question.trim(),
                acceptedAnswer: { "@type": "Answer", text: answer },
              },
            ]
          : []
      }),
    })
  if (type === "HowTo")
    return compact({
      ...base,
      totalTime: values.secondary,
      supply: lines(values.tertiary).map((name) => ({
        "@type": "HowToSupply",
        name,
      })),
      step: lines(values.items).map((text, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        text,
      })),
    })
  if (type === "LocalBusiness")
    return compact({
      ...base,
      telephone: values.secondary,
      address: values.tertiary
        ? { "@type": "PostalAddress", streetAddress: values.tertiary }
        : undefined,
      openingHours: lines(values.items),
    })
  if (type === "Event")
    return compact({
      ...base,
      startDate: values.secondary,
      endDate: values.tertiary,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      location: values.url.trim()
        ? { "@type": "VirtualLocation", url: values.url.trim() }
        : undefined,
      organizer: values.items.trim()
        ? { "@type": "Organization", name: values.items.trim() }
        : undefined,
    })
  if (type === "BreadcrumbList")
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: lines(values.items).flatMap((line, index) => {
        const [name, ...urlParts] = line.split("|")
        const item = urlParts.join("|").trim()
        return name?.trim() && item
          ? [
              {
                "@type": "ListItem",
                position: index + 1,
                name: name.trim(),
                item,
              },
            ]
          : []
      }),
    }
  return compact({
    ...base,
    title: values.name.trim(),
    datePosted: values.secondary,
    validThrough: values.tertiary,
    employmentType: "FULL_TIME",
    hiringOrganization: values.items.trim()
      ? { "@type": "Organization", name: values.items.trim() }
      : undefined,
  })
}

function fieldLabels(type: SchemaType) {
  const map: Record<
    SchemaType,
    { secondary: string; tertiary: string; items: string; itemsHint: string }
  > = {
    Organization: {
      secondary: "",
      tertiary: "",
      items: "Social profile URLs",
      itemsHint: "One absolute URL per line",
    },
    Article: {
      secondary: "Published date",
      tertiary: "Modified date",
      items: "Author name",
      itemsHint: "Visible article author",
    },
    Product: {
      secondary: "SKU",
      tertiary: "Brand",
      items: "Price in USD",
      itemsHint: "Example: 29.00",
    },
    FAQPage: {
      secondary: "",
      tertiary: "",
      items: "Questions and answers",
      itemsHint: "One Question | Answer pair per line",
    },
    HowTo: {
      secondary: "Total time",
      tertiary: "Supplies",
      items: "Steps",
      itemsHint: "One step per line",
    },
    LocalBusiness: {
      secondary: "Phone",
      tertiary: "Street address",
      items: "Opening hours",
      itemsHint: "One Schema.org hours value per line",
    },
    Event: {
      secondary: "Start date and time",
      tertiary: "End date and time",
      items: "Organizer",
      itemsHint: "Organization name",
    },
    BreadcrumbList: {
      secondary: "",
      tertiary: "",
      items: "Breadcrumbs",
      itemsHint: "One Label | URL pair per line",
    },
    JobPosting: {
      secondary: "Posted date",
      tertiary: "Valid through",
      items: "Hiring organization",
      itemsHint: "Organization name",
    },
  }
  return map[type]
}

export function SchemaMarkupGeneratorTool() {
  const [type, setType] = useState<SchemaType>("Organization")
  const [values, setValues] = useState(DEFAULTS)
  const labels = fieldLabels(type)
  const schema = buildSchema(type, values)
  const json = JSON.stringify(schema, null, 2)
  const output = wrapJsonLdInScriptTag(json)
  const update = (field: string, value: string) =>
    setValues((current) => ({ ...current, [field]: value }))

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="schema-input"
        title="Schema details"
        description="Only populated fields are included in the output."
      >
        <div className="space-y-5">
          <ToolField htmlFor="schema-type" label="Schema type">
            <select
              id="schema-type"
              value={type}
              onChange={(event) => setType(event.target.value as SchemaType)}
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              {TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} — {item.helper}
                </option>
              ))}
            </select>
          </ToolField>
          {!["FAQPage", "BreadcrumbList"].includes(type) ? (
            <>
              <ToolField
                htmlFor="schema-name"
                label={
                  type === "Article"
                    ? "Headline"
                    : type === "JobPosting"
                      ? "Job title"
                      : "Name"
                }
                required
              >
                <Input
                  id="schema-name"
                  value={values.name}
                  onChange={(event) => update("name", event.target.value)}
                  className="h-10 border-slate-300 bg-white"
                />
              </ToolField>
              <ToolField htmlFor="schema-description" label="Description">
                <Textarea
                  id="schema-description"
                  value={values.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                  className="min-h-24 border-slate-300 bg-white"
                />
              </ToolField>
              <ToolField
                htmlFor="schema-url"
                label={type === "Event" ? "Event URL" : "Canonical URL"}
              >
                <Input
                  id="schema-url"
                  type="url"
                  value={values.url}
                  onChange={(event) => update("url", event.target.value)}
                  className="h-10 border-slate-300 bg-white"
                />
              </ToolField>
              <ToolField
                htmlFor="schema-image"
                label="Image URL"
                hint="Optional"
              >
                <Input
                  id="schema-image"
                  type="url"
                  value={values.image}
                  onChange={(event) => update("image", event.target.value)}
                  className="h-10 border-slate-300 bg-white"
                />
              </ToolField>
            </>
          ) : null}
          <div className="grid gap-5 sm:grid-cols-2">
            {labels.secondary ? (
              <ToolField htmlFor="schema-secondary" label={labels.secondary}>
                <Input
                  id="schema-secondary"
                  value={values.secondary}
                  onChange={(event) => update("secondary", event.target.value)}
                  type={
                    labels.secondary.toLowerCase().includes("date")
                      ? "datetime-local"
                      : "text"
                  }
                  className="h-10 border-slate-300 bg-white"
                />
              </ToolField>
            ) : null}
            {labels.tertiary ? (
              <ToolField htmlFor="schema-tertiary" label={labels.tertiary}>
                <Input
                  id="schema-tertiary"
                  value={values.tertiary}
                  onChange={(event) => update("tertiary", event.target.value)}
                  type={
                    labels.tertiary.toLowerCase().includes("date")
                      ? "datetime-local"
                      : "text"
                  }
                  className="h-10 border-slate-300 bg-white"
                />
              </ToolField>
            ) : null}
          </div>
          <ToolField
            htmlFor="schema-items"
            label={labels.items}
            hint={labels.itemsHint}
          >
            <Textarea
              id="schema-items"
              value={values.items}
              onChange={(event) => update("items", event.target.value)}
              className="min-h-32 border-slate-300 bg-white font-mono text-xs leading-6"
            />
          </ToolField>
        </div>
      </ToolPanel>
      <ToolPanel
        id="schema-output"
        title="Generated JSON-LD"
        description="Validate this again on the deployed page and keep it aligned with visible content."
        action={
          <ToolStatusBadge
            tone={json.includes('"name": ""') ? "warning" : "good"}
          >
            Valid JSON
          </ToolStatusBadge>
        }
      >
        <CopyableCode code={output} label={`${type} JSON-LD`} />
      </ToolPanel>
    </ToolWorkspaceGrid>
  )
}
