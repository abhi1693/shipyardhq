import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

export type AnswerBlock = {
  title: string
  body: string
}

type AnswerBlocksProps = {
  heading?: string
  blocks: AnswerBlock[]
  className?: string
}

export function AnswerBlocks({
  heading = "Page guide",
  blocks,
  className,
}: AnswerBlocksProps) {
  const visibleBlocks = blocks.filter(
    (block) => block.title.trim() && block.body.trim(),
  )

  if (!visibleBlocks.length) return null

  const machineReadableAnswers = {
    "@context": "https://schema.org",
    "@type": "WebPageElement",
    name: heading,
    hasPart: visibleBlocks.map((block) => ({
      "@type": "WebPageElement",
      name: block.title,
      text: block.body,
    })),
  }

  return (
    <section
      className={cn("border-y border-[#d7dee8] py-4 text-[#0b1c30]", className)}
    >
      <div className="flex items-center justify-between gap-4 pb-2 md:pb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0051d5]">
          {heading}
        </h2>
        <span className="text-[11px] font-medium text-[#64748b] md:hidden">
          Tap to expand
        </span>
      </div>
      <div className="divide-y divide-[#e2e8f0] md:hidden">
        {visibleBlocks.map((block) => (
          <details key={block.title} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-semibold marker:content-none">
              <h3>{block.title}</h3>
              <ChevronDown
                className="size-4 shrink-0 text-[#64748b] transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="pb-3 pr-7 text-sm leading-6 text-[#526174]">
              {block.body}
            </p>
          </details>
        ))}
      </div>
      <div className="hidden grid-cols-2 gap-x-8 gap-y-4 md:grid">
        {visibleBlocks.map((block) => (
          <article key={block.title} className="py-2">
            <h3 className="text-sm font-semibold">{block.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#526174]">
              {block.body}
            </p>
          </article>
        ))}
      </div>
      <script
        hidden
        type="application/ld+json"
        data-machine-readable-answers=""
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(machineReadableAnswers).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
    </section>
  )
}
