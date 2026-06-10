import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
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
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
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
        remaining > 0 ? `${words.slice(0, remaining).join(" ")}...` : "..."

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

function ProductDescriptionMarkdown({
  children,
  allowImages = true,
  limit,
}: {
  children: string
  allowImages?: boolean
  limit?: number
}) {
  const remarkPlugins = limit
    ? [remarkGfm, createWordLimitPlugin(limit)]
    : [remarkGfm]

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      components={{
        a: (props) => (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-foreground/80"
          />
        ),
        img: allowImages
          ? (props) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                {...props}
                alt={(props as { alt?: string }).alt || ""}
                className="rounded-xl"
              />
            )
          : () => null,
      }}
    >
      {children}
    </ReactMarkdown>
  )
}

export function ProductDescriptionCard({
  description,
  className,
}: ProductDescriptionCardProps) {
  const trimmedDescription = description?.trim()
  if (!trimmedDescription) return null

  const plainText = stripMarkdown(trimmedDescription)
  const wordCount = plainText.split(/\s+/).filter(Boolean).length
  const shouldTruncate = wordCount > PREVIEW_WORD_LIMIT

  return (
    <section className={cn("space-y-3", className)}>
      <div
        className={cn(
          "prose prose-sm max-w-none text-foreground [&_*]:leading-relaxed",
          shouldTruncate ? "pb-1" : undefined,
        )}
      >
        <ProductDescriptionMarkdown
          allowImages={!shouldTruncate}
          limit={shouldTruncate ? PREVIEW_WORD_LIMIT : undefined}
        >
          {trimmedDescription}
        </ProductDescriptionMarkdown>
      </div>
      {shouldTruncate ? (
        <details className="group">
          <summary className="inline-flex cursor-pointer list-none items-center text-sm font-semibold text-foreground transition-colors hover:text-foreground/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            Show full description
          </summary>
          <div className="prose prose-sm mt-4 max-w-none border-t border-border pt-4 text-foreground [&_*]:leading-relaxed">
            <ProductDescriptionMarkdown>
              {trimmedDescription}
            </ProductDescriptionMarkdown>
          </div>
        </details>
      ) : null}
    </section>
  )
}

export default ProductDescriptionCard
