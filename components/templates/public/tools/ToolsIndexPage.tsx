import type { ReactNode } from "react"
import { SearchCheck } from "lucide-react"

import { FounderLaunchCta } from "@/components/templates/public/tools/FounderLaunchCta"
import { ToolCard } from "@/components/templates/public/tools/ToolCard"
import { FREE_SEO_TOOLS } from "@/lib/tools/catalog"
import type { FreeToolDefinition } from "@/lib/tools/types"

export type ToolsIndexPageProps = {
  tools?: readonly FreeToolDefinition[]
  structuredData?: ReactNode
  title?: string
  description?: string
}

export function ToolsIndexPage({
  tools = FREE_SEO_TOOLS,
  structuredData,
  title = "Useful SEO tools, free without an account",
  description = "Audit public pages, diagnose performance, analyze content, and generate the technical files your launch needs. No trials, credits, or locked results.",
}: ToolsIndexPageProps) {
  const featuredSlugs = new Set([
    "seo-audit",
    "bulk-seo-audit",
    "seo-comparison",
    "core-web-vitals-checker",
  ])
  const featured = tools.filter((tool) => featuredSlugs.has(tool.slug))
  const grouped = tools
    .filter((tool) => !featuredSlugs.has(tool.slug))
    .reduce<Map<string, FreeToolDefinition[]>>((groups, tool) => {
      const items = groups.get(tool.category) ?? []
      items.push(tool)
      groups.set(tool.category, items)
      return groups
    }, new Map())

  return (
    <main className="min-h-screen bg-[#f8faff] text-[#0b1c30]">
      {structuredData}

      <section className="bg-[#061d31] px-4 py-16 text-white md:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#c0ff00]">
            <SearchCheck className="size-4" aria-hidden />
            Founder SEO toolkit
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-3xl font-bold leading-10 text-white md:text-5xl md:leading-tight">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-7 text-[#d0e4ff]/80">
            {description}
          </p>
          <div className="mx-auto mt-6 flex w-fit flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold text-[#d0e4ff]">
            <span>{tools.length} tools</span>
            <span aria-hidden>·</span>
            <span>Always free</span>
            <span aria-hidden>·</span>
            <span>No signup</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6 md:py-12">
        {featured.length ? (
          <section aria-labelledby="featured-tools-heading">
            <p className="text-sm font-semibold text-[#0051d5]">
              Start with evidence
            </p>
            <h2
              id="featured-tools-heading"
              className="mt-1 text-balance text-2xl font-bold text-[#0b1c30] md:text-3xl"
            >
              Audit and compare any public page
            </h2>
            <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-[#43474c]">
              Transparent checks show the evidence behind every score. Export
              the findings and keep working without creating an account.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {featured.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-12 space-y-10">
          {[...grouped.entries()].map(([category, categoryTools]) => (
            <section key={category} aria-labelledby={`tools-${category}`}>
              <div className="mb-4 flex items-end justify-between gap-4 border-b border-[#e2e8f0] pb-3">
                <h2
                  id={`tools-${category}`}
                  className="text-xl font-bold text-[#0b1c30]"
                >
                  {category}
                </h2>
                <span className="text-xs font-semibold text-[#64748b]">
                  {categoryTools.length} free tool
                  {categoryTools.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryTools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} compact />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section
          id="why-these-tools"
          className="mt-12 rounded-xl border border-[#e2e8f0] bg-white p-6 md:p-8"
          aria-labelledby="why-tools-heading"
        >
          <p className="text-sm font-semibold text-[#0051d5]">
            Product launch SEO
          </p>
          <h2
            id="why-tools-heading"
            className="mt-1 max-w-3xl text-balance text-2xl font-bold text-[#0b1c30] md:text-3xl"
          >
            Make the product easier to discover before launch traffic arrives
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0b1c30]">
                Explain the product
              </h3>
              <p className="mt-2 text-pretty text-sm leading-6 text-[#43474c]">
                Align keywords, descriptions, titles, and URLs around the
                audience problem your product actually solves.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0b1c30]">
                Improve every share
              </h3>
              <p className="mt-2 text-pretty text-sm leading-6 text-[#43474c]">
                Check how the launch appears in search, social feeds, and chat
                before a cached or incomplete preview spreads.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#0b1c30]">
                Remove technical gaps
              </h3>
              <p className="mt-2 text-pretty text-sm leading-6 text-[#43474c]">
                Publish clean schema, robots rules, and sitemap files so
                crawlers can understand the same product visitors see.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <FounderLaunchCta />
        </div>
      </div>
    </main>
  )
}
