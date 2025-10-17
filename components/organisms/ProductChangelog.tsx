import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { format, formatDistanceToNow } from "date-fns"

import type { ProductUpdatePublicView } from "@/types/product-updates"
import { cn } from "@/lib/utils"

type ProductChangelogProps = {
  productName: string
  updates: ProductUpdatePublicView[]
  footer?: React.ReactNode
}

export function ProductChangelog({
  productName,
  updates,
  footer,
}: ProductChangelogProps) {
  if (!updates.length) return null

  return (
    <section
      id="changelog"
      aria-labelledby="product-changelog-heading"
      className="rounded-3xl border border-border bg-[linear-gradient(145deg,#f9fafb,#ffffff)] shadow-sm"
    >
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            <span
              className="inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
              aria-hidden
            />
            Product updates
          </p>
          <h2
            id="product-changelog-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            What&apos;s new in {productName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Highlights from the team — shipped fixes, new features, and product
            polish.
          </p>
        </div>

        <div className="mt-8 space-y-6 sm:space-y-8">
          {updates.map((update) => {
            const published = update.publishedAt ?? update.createdAt
            const publishedAt = new Date(published)
            const updatedAt = new Date(update.updatedAt)
            return (
              <article
                key={update.id}
                id={`update-${update.id}`}
                className={cn(
                  "relative overflow-hidden rounded-2xl border border-border/60 bg-white/90 p-5 shadow-sm transition hover:border-border hover:shadow-md sm:p-6",
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                      {update.title}
                    </h3>
                    {update.summary ? (
                      <p className="text-sm text-muted-foreground">
                        {update.summary}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground sm:text-right">
                    <div>Published {format(publishedAt, "MMM d, yyyy")}</div>
                    <div>
                      Updated{" "}
                      {formatDistanceToNow(updatedAt, { addSuffix: true })}
                    </div>
                  </div>
                </div>

                <div className="prose prose-sm mt-4 max-w-none text-muted-foreground [&>*:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    disallowedElements={["h1"]}
                    unwrapDisallowed
                  >
                    {update.content}
                  </ReactMarkdown>
                </div>
              </article>
            )
          })}
        </div>
        {footer ? <div className="mt-6 flex justify-end">{footer}</div> : null}
      </div>
    </section>
  )
}
