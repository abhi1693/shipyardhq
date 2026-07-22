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
  heading = "Quick answers",
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
    <section className={cn("space-y-4", className)}>
      <h2 className="text-xl font-bold text-[#0b1c30]">{heading}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {visibleBlocks.map((block) => (
          <article
            key={block.title}
            className="rounded-xl border border-[#e2e8f0] bg-white p-5"
          >
            <h3 className="text-sm font-semibold text-[#0b1c30]">
              {block.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#43474c]">
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
