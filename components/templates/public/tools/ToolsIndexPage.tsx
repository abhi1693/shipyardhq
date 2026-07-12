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
  title = "Free SEO tools for startup launches",
  description = "Prepare your product page for search, sharing, and launch day with focused tools built for founders. No account or paid SEO suite required.",
}: ToolsIndexPageProps) {
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
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6 md:py-12">
        <section aria-label="Free SEO tools">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>

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
