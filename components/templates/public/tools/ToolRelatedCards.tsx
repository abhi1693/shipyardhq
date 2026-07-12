import { ToolCard } from "@/components/templates/public/tools/ToolCard"
import type { FreeToolDefinition } from "@/lib/tools/types"

export function ToolRelatedCards({
  tools,
}: {
  tools: readonly FreeToolDefinition[]
}) {
  if (!tools.length) return null

  return (
    <section aria-labelledby="related-tools-heading">
      <div className="mb-5">
        <p className="text-sm font-semibold text-[#0051d5]">Keep improving</p>
        <h2
          id="related-tools-heading"
          className="mt-1 text-balance text-2xl font-bold text-[#0b1c30]"
        >
          Related free SEO tools
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} compact />
        ))}
      </div>
    </section>
  )
}
