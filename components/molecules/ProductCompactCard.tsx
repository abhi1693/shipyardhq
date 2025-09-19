import { ReactNode } from "react"
import Image from "next/image"
import { clickProductCardAction } from "@/actions/public/products/analytics"
import { UpvoteSquare } from "@/components/molecules/UpvoteSquare"

interface ProductCompactCardProps {
  product: {
    id: string
    slug: string
    name: string
    logo: string
    tagline: string
  }
  upvotes?: number
  category?: string | null
  imagePriority?: boolean
  meta?: ReactNode
  showCategory?: boolean
}

export function ProductCompactCard({
  product,
  upvotes = 0,
  category,
  imagePriority = false,
  meta,
  showCategory = true,
}: ProductCompactCardProps) {
  return (
    <form
      action={clickProductCardAction}
      className="h-full"
      data-testid="product-compact-card"
    >
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="productSlug" value={product.slug} />
      <button
        type="submit"
        className="group relative block h-full w-full cursor-pointer rounded-lg border bg-card p-4 text-left text-card-foreground shadow-sm transition-all hover:border-[color:var(--brand-1)/0.35] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.25]"
      >
        {meta ? (
          <div className="absolute right-4 top-3 sm:top-4">{meta}</div>
        ) : null}
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[color:var(--brand-1)/0.2] bg-[color:var(--brand-1)/0.08]">
              <Image
                src={product.logo}
                alt={product.name}
                width={40}
                height={40}
                className="h-full w-full object-cover"
                loading={imagePriority ? "eager" : "lazy"}
                priority={imagePriority}
              />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold leading-tight text-foreground line-clamp-1">
                {product.name}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {product.tagline}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <UpvoteSquare
              count={upvotes}
              compact
              className="shrink-0"
              title={`${upvotes} upvotes`}
            />
            {showCategory && category ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--brand-1)/0.2] bg-[color:var(--brand-1)/0.08] px-2 py-0.5 text-[11px] font-medium text-[color:var(--brand-1)]">
                {category}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </form>
  )
}
