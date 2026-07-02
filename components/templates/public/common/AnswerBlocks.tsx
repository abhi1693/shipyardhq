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
    <script
      hidden
      type="application/ld+json"
      data-machine-readable-answers=""
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(machineReadableAnswers).replace(/</g, "\\u003c"),
      }}
    />
  )
}
