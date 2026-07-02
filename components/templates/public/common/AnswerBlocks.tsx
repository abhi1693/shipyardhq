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
  className = "",
}: AnswerBlocksProps) {
  const visibleBlocks = blocks.filter(
    (block) => block.title.trim() && block.body.trim(),
  )

  if (!visibleBlocks.length) return null

  return (
    <section
      className={`rounded-xl border border-[#d7dee8] bg-white p-5 shadow-sm ${className}`}
      aria-labelledby="answer-blocks-heading"
    >
      <h2
        id="answer-blocks-heading"
        className="text-lg font-semibold text-[#0b1c30]"
      >
        {heading}
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {visibleBlocks.map((block) => (
          <article key={block.title} className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[#0b1c30]">
              {block.title}
            </h3>
            <p className="text-sm leading-6 text-[#43474c]">{block.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
