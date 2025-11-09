import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Megaphone } from "lucide-react"

import { productUpdatesPath } from "@/lib/routes"
import type { ProductUpdatePublicView } from "@/types/product-updates"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

export function ProductUpdatesSection({
  updates,
  productSlug,
}: {
  updates: ProductUpdatePublicView[]
  productSlug: string
}) {
  const visibleUpdates = updates.slice(0, 3)
  const updatesCount = updates.length
  const hasUpdates = updatesCount > 0
  const updatesBadgeClass = [
    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
    hasUpdates
      ? "border-border bg-white text-foreground shadow-sm shadow-black/5"
      : "border-dashed border-border/80 text-muted-foreground",
  ].join(" ")

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-muted text-foreground shadow-sm">
            <Megaphone className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Product updates
            </h2>
            <p className="text-sm text-muted-foreground">
              {hasUpdates
                ? "Latest changelog entries and announcements from the team."
                : "No updates yet. Check back soon for announcements from the team."}
            </p>
          </div>
        </div>
        <div className={updatesBadgeClass}>
          <span>
            {updatesCount} update{updatesCount === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      {hasUpdates ? (
        <div className="divide-y divide-border/70">
          {visibleUpdates.map((update) => {
            const publishedLabel = dateFormatter.format(
              new Date(update.publishedAt ?? update.createdAt),
            )
            return (
              <article
                key={update.id}
                className="space-y-4 py-5 first:pt-0 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                      {update.title}
                    </h3>
                    {update.summary ? (
                      <p className="text-sm text-muted-foreground">
                        {update.summary}
                      </p>
                    ) : null}
                  </div>
                  <time
                    dateTime={update.publishedAt ?? update.createdAt}
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80"
                  >
                    {publishedLabel}
                  </time>
                </div>
                {update.content ? (
                  <div className="prose prose-sm mt-4 max-w-none text-muted-foreground [&>*:last-child]:mb-0">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      disallowedElements={["h1"]}
                      unwrapDisallowed
                    >
                      {update.content}
                    </ReactMarkdown>
                  </div>
                ) : null}
              </article>
            )
          })}
          {updatesCount > visibleUpdates.length ? (
            <div className="mt-4 flex justify-end">
              <Link
                href={productUpdatesPath(productSlug)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                View all updates
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
