import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

interface ProductDescriptionCardProps {
  description?: string | null
  className?: string
}

function ProductDescriptionMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: (props) => (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-foreground/80"
          />
        ),
        img: (props) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            {...props}
            alt={(props as { alt?: string }).alt || ""}
            className="rounded-xl"
          />
        ),
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

  return (
    <section className={cn("space-y-3", className)}>
      <div className="prose prose-sm max-w-none text-foreground [&_*]:leading-relaxed">
        <ProductDescriptionMarkdown>
          {trimmedDescription}
        </ProductDescriptionMarkdown>
      </div>
    </section>
  )
}

export default ProductDescriptionCard
