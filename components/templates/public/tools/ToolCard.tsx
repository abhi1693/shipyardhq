import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

import { ToolIcon } from "@/components/templates/public/tools/ToolIcon"
import { freeToolPath } from "@/lib/tools/catalog"
import type { FreeToolDefinition } from "@/lib/tools/types"

export function ToolCard({
  tool,
  compact = false,
}: {
  tool: FreeToolDefinition
  compact?: boolean
}) {
  return (
    <Link
      href={freeToolPath(tool.slug)}
      className="group flex h-full flex-col rounded-xl border border-[#e2e8f0] bg-white p-5 hover:border-[#0051d5]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5] focus-visible:ring-offset-2"
    >
      <div className="flex items-start">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eff4ff] text-[#0051d5]">
          <ToolIcon name={tool.icon} />
        </span>
      </div>

      <div className="mt-5 flex-1">
        <p className="text-xs font-semibold uppercase text-[#0051d5]">
          {tool.category}
        </p>
        <h2
          className={
            compact
              ? "mt-2 text-balance text-lg font-semibold leading-6 text-[#0b1c30] group-hover:text-[#0051d5]"
              : "mt-2 text-balance text-xl font-semibold leading-7 text-[#0b1c30] group-hover:text-[#0051d5]"
          }
        >
          {tool.name}
        </h2>
        <p className="mt-2 text-pretty text-sm leading-6 text-[#43474c]">
          {tool.description}
        </p>

        {!compact ? (
          <ul className="mt-4 space-y-2">
            {tool.features.slice(0, 2).map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm leading-5 text-[#43474c]"
              >
                <Check
                  className="mt-0.5 size-4 shrink-0 text-[#166534]"
                  aria-hidden
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <span className="mt-5 inline-flex items-center gap-2 border-t border-[#e2e8f0] pt-4 text-sm font-semibold text-[#0051d5]">
        Open tool
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  )
}
