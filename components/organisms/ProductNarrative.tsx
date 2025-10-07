import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { productPageCopy } from "@/lib/copy/productPage"

interface ProductNarrativeProps {
  description?: string | null
}

export function ProductNarrative({ description }: ProductNarrativeProps) {
  const { narrative } = productPageCopy

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
          {narrative.heading}
        </p>
      </header>
      <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm shadow-black/5">
        {description ? (
          <div className="prose max-w-none prose-neutral dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: (props) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  />
                ),
                img: (props) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    {...props}
                    alt={(props as any).alt || ""}
                    className="rounded-xl"
                  />
                ),
              }}
            >
              {description}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {narrative.placeholder}
          </p>
        )}
      </div>
    </section>
  )
}
