import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"

import { FounderLaunchCta } from "@/components/templates/public/tools/FounderLaunchCta"
import { ToolFaqSection } from "@/components/templates/public/tools/ToolFaqSection"
import { ToolIcon } from "@/components/templates/public/tools/ToolIcon"
import { ToolRelatedCards } from "@/components/templates/public/tools/ToolRelatedCards"
import { FREE_TOOLS_PATH, getRelatedFreeTools } from "@/lib/tools/catalog"
import type { FreeToolDefinition } from "@/lib/tools/types"

export type ToolPageShellProps = {
  tool: FreeToolDefinition
  children: ReactNode
  structuredData?: ReactNode
  relatedTools?: readonly FreeToolDefinition[]
  educationContent?: ReactNode
  faqContent?: ReactNode
  workspaceTitle?: string
  workspaceDescription?: string
}

function DefaultEducation({ tool }: { tool: FreeToolDefinition }) {
  if (!tool.guide.length) return null

  return (
    <section aria-labelledby="tool-guide-heading">
      <p className="text-sm font-semibold text-[#0051d5]">Founder guide</p>
      <h2
        id="tool-guide-heading"
        className="mt-1 text-balance text-2xl font-bold text-[#0b1c30]"
      >
        How to use this tool for a stronger launch
      </h2>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {tool.guide.map((section) => (
          <article
            key={section.title}
            className="rounded-xl border border-[#e2e8f0] bg-white p-5 md:p-6"
          >
            <h3 className="text-balance text-lg font-semibold text-[#0b1c30]">
              {section.title}
            </h3>
            <p className="mt-2 text-pretty text-sm leading-6 text-[#43474c]">
              {section.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

export function ToolPageShell({
  tool,
  children,
  structuredData,
  relatedTools,
  educationContent,
  faqContent,
  workspaceTitle,
  workspaceDescription,
}: ToolPageShellProps) {
  const resolvedRelatedTools = relatedTools ?? getRelatedFreeTools(tool, 3)
  const resolvedEducation =
    educationContent === undefined ? (
      <DefaultEducation tool={tool} />
    ) : (
      educationContent
    )
  const resolvedFaq =
    faqContent === undefined ? <ToolFaqSection items={tool.faqs} /> : faqContent

  return (
    <main className="min-h-screen bg-[#f8faff] text-[#0b1c30]">
      {structuredData}

      <section className="bg-[#061d31] px-4 py-12 text-white md:px-6 md:py-16">
        <div className="mx-auto max-w-[1200px]">
          <Link
            href={FREE_TOOLS_PATH}
            className="inline-flex items-center gap-2 rounded text-sm font-semibold text-[#d0e4ff]/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#061d31]"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All free SEO tools
          </Link>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-12 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-[#c0ff00]">
                  <ToolIcon name={tool.icon} className="size-6" />
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#d0e4ff]">
                  {tool.category}
                </span>
              </div>
              <h1 className="mt-5 max-w-4xl text-balance text-3xl font-bold leading-10 text-white md:text-5xl md:leading-tight">
                {tool.name}
              </h1>
              <p className="mt-4 max-w-3xl text-pretty text-base leading-7 text-[#d0e4ff]/80">
                {tool.description}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-5 lg:col-span-4">
              <p className="text-xs font-semibold uppercase text-[#c0ff00]">
                What you get
              </p>
              <p className="mt-2 text-pretty text-sm font-semibold leading-6 text-white">
                {tool.resultLabel}
              </p>
              <ul className="mt-4 space-y-2.5">
                {tool.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm leading-5 text-[#d0e4ff]/80"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-[#c0ff00]"
                      aria-hidden
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] space-y-12 px-4 py-10 md:px-6 md:py-12">
        <section
          id="tool"
          aria-labelledby="tool-workspace-heading"
          className="scroll-mt-24"
        >
          <div className="mb-6 max-w-3xl">
            <p className="text-sm font-semibold text-[#0051d5]">
              Interactive workspace
            </p>
            <h2
              id="tool-workspace-heading"
              className="mt-1 text-balance text-2xl font-bold text-[#0b1c30] md:text-3xl"
            >
              {workspaceTitle ?? tool.shortName}
            </h2>
            <p className="mt-2 text-pretty text-sm leading-6 text-[#43474c]">
              {workspaceDescription ??
                "Add your inputs, review the live result, then copy or download it when it is ready."}
            </p>
          </div>
          {children}
        </section>

        {resolvedEducation}

        <ToolRelatedCards tools={resolvedRelatedTools} />

        {resolvedFaq}

        <FounderLaunchCta />
      </div>
    </main>
  )
}
