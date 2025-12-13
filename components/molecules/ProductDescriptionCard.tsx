"use client"

import { useId, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { Plugin } from "unified"
import type { Parent } from "unist"
import type { Root } from "mdast"
import { visitParents } from "unist-util-visit-parents"

import { cn } from "@/lib/utils"

interface ProductDescriptionCardProps {
  description?: string | null
  className?: string
}

const PREVIEW_WORD_LIMIT = 130

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, (match) => match.replace(/`/g, ""))
    .replace(/[*_~>#]/g, "")
    .replace(/^-+\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function createWordLimitPlugin(limit: number): Plugin<[], Root> {
  return () => (tree) => {
    let wordCount = 0
    let hasTruncated = false

    visitParents(tree, "text", (node, ancestors) => {
      if (hasTruncated) {
        const parent = ancestors.at(-1) as Parent | undefined
        if (parent) {
          const index = parent.children.indexOf(node)
          if (index > -1) {
            parent.children.splice(index, 1)
          }
        }
        return
      }

      const words = node.value.split(/\s+/).filter(Boolean)
      if (!words.length) return

      if (wordCount + words.length < limit) {
        wordCount += words.length
        return
      }

      const remaining = Math.max(limit - wordCount, 0)
      const truncatedText =
        remaining > 0 ? words.slice(0, remaining).join(" ") + "…" : "…"

      node.value = truncatedText
      wordCount = limit
      hasTruncated = true

      const parent = ancestors.at(-1) as Parent | undefined
      if (parent) {
        const index = parent.children.indexOf(node)
        if (index > -1) {
          parent.children = parent.children.slice(0, index + 1)
        }
      }

      for (let level = ancestors.length - 2; level >= 0; level -= 1) {
        const ancestor = ancestors[level] as Parent
        const child = ancestors[level + 1]
        const childIndex = ancestor.children.indexOf(child as never)
        if (childIndex > -1) {
          ancestor.children = ancestor.children.slice(0, childIndex + 1)
        }
      }
    })
  }
}

export function ProductDescriptionCard({
  description,
  className,
}: ProductDescriptionCardProps) {
  const contentId = useId()
  const [isExpanded, setIsExpanded] = useState(false)

  const trimmedDescription = description?.trim()

  const { wordCount } = useMemo(() => {
    if (!trimmedDescription) {
      return { wordCount: 0 }
    }

    const plainText = stripMarkdown(trimmedDescription)
    const words = plainText.split(/\s+/).filter(Boolean).length
    return { wordCount: words }
  }, [trimmedDescription])

  const shouldTruncate = wordCount > PREVIEW_WORD_LIMIT

  const baseRemarkPlugins = useMemo(() => [remarkGfm], [])
  const limitedRemarkPlugins = useMemo(
    () => [remarkGfm, createWordLimitPlugin(PREVIEW_WORD_LIMIT)],
    [],
  )

  if (!trimmedDescription) {
    return null
  }

  return (
    <section className={cn("space-y-3", className)}>
      <div className="relative">
        <div
          id={contentId}
          className={cn(
            "prose prose-sm max-w-none text-foreground [&_*]:leading-relaxed",
            !isExpanded && shouldTruncate ? "pb-3" : undefined,
          )}
        >
          <ReactMarkdown
            remarkPlugins={
              isExpanded || !shouldTruncate
                ? baseRemarkPlugins
                : limitedRemarkPlugins
            }
            components={{
              a: (props) => (
                <a
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-foreground/80"
                />
              ),
              img:
                isExpanded || !shouldTruncate
                  ? (props) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        {...props}
                        alt={(props as any).alt || ""}
                        className="rounded-xl"
                      />
                    )
                  : () => null,
            }}
          >
            {trimmedDescription}
          </ReactMarkdown>
        </div>
        {!isExpanded && shouldTruncate ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-white/95" />
        ) : null}
      </div>
      {shouldTruncate ? (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-foreground transition-colors hover:text-foreground/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-expanded={isExpanded}
          aria-controls={contentId}
        >
          {isExpanded ? (
            <>
              <ChevronUp aria-hidden className="h-4 w-4" />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronDown aria-hidden className="h-4 w-4" />
              <span>Show more</span>
            </>
          )}
        </button>
      ) : null}
    </section>
  )
}

export default ProductDescriptionCard
