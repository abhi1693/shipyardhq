import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { productPageCopy } from "@/lib/copy/productPage"

interface ProductNarrativeProps {
  description?: string | null
}

export function ProductNarrative({ description }: ProductNarrativeProps) {
  const { narrative } = productPageCopy

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--brand-1)]">
          {narrative.heading}
        </p>
      </header>
      <div className="rounded-3xl bg-white p-8 shadow-[0_30px_80px_-65px_rgba(7,58,104,0.4)] ring-1 ring-slate-200/60 dark:bg-slate-900/80 dark:ring-slate-800/50">
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
                  <img {...props} alt={(props as any).alt || ""} className="rounded-xl" />
                ),
              }}
            >
              {description}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {narrative.placeholder}
          </p>
        )}
      </div>
    </section>
  )
}
