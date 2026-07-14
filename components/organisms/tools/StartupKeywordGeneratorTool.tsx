"use client"

import { useState } from "react"

import { Input } from "@/components/atoms/input"

import {
  CopyTextButton,
  DownloadTextButton,
  ToolEmptyState,
  ToolField,
  ToolMetric,
  ToolPanel,
  ToolStatusBadge,
  ToolWorkspaceGrid,
} from "./ToolWorkspaceUi"

type KeywordCluster = {
  name: string
  intent: string
  keywords: string[]
}

function cleanPhrase(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
}

function unique(values: string[]) {
  return [...new Set(values.map(cleanPhrase).filter(Boolean))]
}

function buildClusters({
  productName,
  offering,
  audience,
  outcome,
  competitor,
}: {
  productName: string
  offering: string
  audience: string
  outcome: string
  competitor: string
}): KeywordCluster[] {
  const product = cleanPhrase(productName)
  const category = cleanPhrase(offering)
  const people = cleanPhrase(audience)
  const result = cleanPhrase(outcome)
  const rival = cleanPhrase(competitor)

  if (!category || !people) return []

  return [
    {
      name: "Core category",
      intent: "People exploring the type of product",
      keywords: unique([
        category,
        `best ${category}`,
        `${category} for ${people}`,
        `${category} platform`,
        `${category} software`,
      ]),
    },
    {
      name: "Problem and outcome",
      intent: "People trying to accomplish a specific job",
      keywords: unique([
        result ? `how to ${result}` : "",
        result ? `tools to ${result}` : "",
        result ? `${result} for ${people}` : "",
        result ? `best way to ${result}` : "",
        result ? `${category} to ${result}` : "",
      ]),
    },
    {
      name: "Commercial investigation",
      intent: "People comparing options before choosing",
      keywords: unique([
        `${category} pricing`,
        `${category} reviews`,
        `affordable ${category}`,
        `free ${category}`,
        `${category} comparison`,
      ]),
    },
    {
      name: "Comparison pages",
      intent: "People looking for alternatives or head-to-head pages",
      keywords: unique([
        product ? `${product} alternatives` : "",
        product && rival ? `${product} vs ${rival}` : "",
        rival ? `${rival} alternatives` : "",
        rival ? `${category} like ${rival}` : "",
        `top ${category} tools`,
      ]),
    },
    {
      name: "Questions and education",
      intent: "People learning about the category",
      keywords: unique([
        `what is ${category}`,
        `how does ${category} work`,
        `how to choose ${category}`,
        `${category} guide for ${people}`,
        `do ${people} need ${category}`,
      ]),
    },
    {
      name: "Branded searches",
      intent: "People already aware of your product",
      keywords: unique([
        product,
        product ? `${product} pricing` : "",
        product ? `${product} reviews` : "",
        product ? `${product} demo` : "",
        product ? `how to use ${product}` : "",
      ]),
    },
  ].filter((cluster) => cluster.keywords.length > 0)
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export function StartupKeywordGeneratorTool() {
  const [productName, setProductName] = useState("Shipyard")
  const [offering, setOffering] = useState("product launch platform")
  const [audience, setAudience] = useState("startup founders")
  const [outcome, setOutcome] = useState(
    "launch a product and reach early users",
  )
  const [competitor, setCompetitor] = useState("Product Hunt")

  const clusters = buildClusters({
    productName,
    offering,
    audience,
    outcome,
    competitor,
  })
  const allKeywords = clusters.flatMap((cluster) => cluster.keywords)
  const textExport = clusters
    .map(
      (cluster) =>
        `${cluster.name}\n${cluster.keywords.map((keyword) => `- ${keyword}`).join("\n")}`,
    )
    .join("\n\n")
  const csvExport = [
    "cluster,intent,keyword",
    ...clusters.flatMap((cluster) =>
      cluster.keywords.map((keyword) =>
        [cluster.name, cluster.intent, keyword].map(csvCell).join(","),
      ),
    ),
  ].join("\n")

  return (
    <ToolWorkspaceGrid>
      <ToolPanel
        id="keyword-input"
        title="Describe your product"
        description="Use plain language your customers would recognize. The generator combines your inputs into search-intent clusters."
      >
        <div className="space-y-5">
          <ToolField htmlFor="keyword-product" label="Product name">
            <Input
              id="keyword-product"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="Shipyard"
              maxLength={80}
            />
          </ToolField>

          <ToolField
            htmlFor="keyword-offering"
            label="Product category"
            hint="2–5 words works best"
            required
            error={
              !offering.trim()
                ? "Add the category people would search for."
                : undefined
            }
          >
            <Input
              id="keyword-offering"
              value={offering}
              onChange={(event) => setOffering(event.target.value)}
              placeholder="product launch platform"
              aria-invalid={!offering.trim()}
              aria-describedby={
                !offering.trim() ? "keyword-offering-error" : undefined
              }
              maxLength={100}
            />
          </ToolField>

          <ToolField
            htmlFor="keyword-audience"
            label="Target audience"
            required
            error={
              !audience.trim()
                ? "Add the people your product is designed for."
                : undefined
            }
          >
            <Input
              id="keyword-audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="startup founders"
              aria-invalid={!audience.trim()}
              aria-describedby={
                !audience.trim() ? "keyword-audience-error" : undefined
              }
              maxLength={100}
            />
          </ToolField>

          <ToolField
            htmlFor="keyword-outcome"
            label="Main outcome"
            hint="Start with a verb"
          >
            <Input
              id="keyword-outcome"
              value={outcome}
              onChange={(event) => setOutcome(event.target.value)}
              placeholder="launch a product and reach early users"
              maxLength={140}
            />
          </ToolField>

          <ToolField
            htmlFor="keyword-competitor"
            label="Known alternative"
            hint="Optional"
          >
            <Input
              id="keyword-competitor"
              value={competitor}
              onChange={(event) => setCompetitor(event.target.value)}
              placeholder="Product Hunt"
              maxLength={80}
            />
          </ToolField>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-pretty text-xs leading-5 text-blue-900">
            These are idea patterns, not measured keyword volumes. Validate
            promising phrases with Search Console or your preferred keyword data
            source.
          </div>
        </div>
      </ToolPanel>

      <ToolPanel
        id="keyword-results"
        title="Keyword clusters"
        description="Choose phrases that closely match your page and searcher intent; avoid forcing every phrase into one page."
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <CopyTextButton
              text={textExport}
              label="Copy all"
              disabled={!allKeywords.length}
            />
            <DownloadTextButton
              content={csvExport}
              filename="startup-keywords.csv"
              label="CSV"
              mimeType="text/csv;charset=utf-8"
              disabled={!allKeywords.length}
            />
          </div>
        }
      >
        {!clusters.length ? (
          <ToolEmptyState
            title="Add a category and audience"
            description="Those two fields are enough to build your first set of keyword ideas."
          />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <ToolMetric label="Ideas" value={allKeywords.length} />
              <ToolMetric label="Intent clusters" value={clusters.length} />
            </div>

            {clusters.map((cluster) => (
              <section
                key={cluster.name}
                aria-labelledby={`cluster-${cluster.name.replace(/ /g, "-").toLowerCase()}`}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3
                      id={`cluster-${cluster.name.replace(/ /g, "-").toLowerCase()}`}
                      className="text-sm font-semibold text-slate-950"
                    >
                      {cluster.name}
                    </h3>
                    <p className="mt-1 text-pretty text-xs leading-4 text-slate-500">
                      {cluster.intent}
                    </p>
                  </div>
                  <CopyTextButton
                    text={cluster.keywords.join("\n")}
                    label="Copy"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cluster.keywords.map((keyword) => (
                    <ToolStatusBadge key={keyword}>{keyword}</ToolStatusBadge>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </ToolPanel>
    </ToolWorkspaceGrid>
  )
}
