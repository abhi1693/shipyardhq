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
        className="group relative block h-full w-full cursor-pointer overflow-hidden rounded-2xl border border-[color:var(--brand-1)/0.1] bg-gradient-to-br from-background/98 via-background/92 to-[color:var(--brand-1)/0.04] p-4 text-left text-card-foreground shadow-[0px_18px_52px_-44px_rgba(7,58,104,0.5)] ring-1 ring-inset ring-white/12 transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--brand-1)/0.16] hover:shadow-[0px_24px_70px_-50px_rgba(7,58,104,0.64)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-1)/0.22] dark:border-white/14"
      >
        {meta ? (
          <div className="absolute right-4 top-3 sm:top-4">{meta}</div>
        ) : null}
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[color:var(--brand-1)/0.12] shadow-[0px_18px_38px_-30px_rgba(7,58,104,0.85)] ring-1 ring-inset ring-white/10">
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
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-1)/0.12] px-2 py-0.5 text-[11px] font-medium text-[color:var(--brand-1)] shadow-[0px_12px_32px_-28px_rgba(7,58,104,0.75)] ring-1 ring-inset ring-white/10">
                {category}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </form>
  )
}
