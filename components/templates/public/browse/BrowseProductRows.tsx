import { Fragment } from "react"
import Link from "next/link"
import { ArrowUp, BadgeCheck, ImageIcon, Sparkles } from "lucide-react"

import { ProductLogoImage } from "@/components/atoms/product-logo-image"
import { GoogleAdsenseUnit } from "@/components/molecules/GoogleAdsenseUnit"
import { ProductCategoryPills } from "@/components/molecules/ProductCategoryPills"
import type {
  ProductCardBase,
  ProductCardItem,
} from "@/components/molecules/ProductCard"
import { toProductCardItem } from "@/lib/products/card-item"
import { productPath } from "@/lib/routes"

function ProductLogo({ product }: { product: ProductCardItem }) {
  if (!product.logo) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#eff4ff] text-[#43474c]">
        <ImageIcon className="h-6 w-6" aria-hidden />
      </div>
    )
  }

  return (
    <ProductLogoImage
      src={product.logo}
      name={product.name}
      fill
      sizes="56px"
      className="object-cover"
    />
  )
}

export function BrowseProductRow({ product }: { product: ProductCardItem }) {
  const href = productPath(product.slug)
  const score =
    typeof product.scoreCount === "number" &&
    Number.isFinite(product.scoreCount)
      ? product.scoreCount
      : null
  const badges = product.badges ?? []

  return (
    <article className="group flex items-center gap-4 rounded-lg border border-[#e2e8f0] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#10b981] hover:shadow-lg">
      <Link
        href={href}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#eff4ff]"
      >
        <ProductLogo product={product} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href={href}
            className="truncate text-lg font-semibold text-[#061d31] transition group-hover:text-[#0051d5]"
          >
            {product.name}
          </Link>
          {product.isVerified ? (
            <span className="inline-flex items-center gap-1 rounded bg-[#eff6ff] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#0051d5]">
              <BadgeCheck className="h-3 w-3" aria-hidden />
              Verified
            </span>
          ) : null}
          {product.isSponsored || product.sponsored ? (
            <span className="inline-flex items-center gap-1 rounded bg-[#ffedd5] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#9a3412]">
              <Sparkles className="h-3 w-3" aria-hidden />
              Sponsored
            </span>
          ) : badges.length ? (
            <span className="rounded bg-[#10b981]/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#047857]">
              {badges[0]}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-1 text-sm text-[#43474c]">
          {product.tagline ||
            "Discover launch-ready tools from indie makers worldwide."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ProductCategoryPills
            categories={product.categories}
            className="gap-1.5"
            pillClassName="rounded border-0 bg-[#f8fafc] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#43474c]"
            linkClassName="hover:bg-[#0051d5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0051d5] focus-visible:ring-offset-2"
          />
        </div>
      </div>
      <Link
        href={href}
        className="flex shrink-0 cursor-pointer flex-col items-center gap-1 rounded-lg bg-[#f8fafc] px-4 py-2 text-[#43474c] transition group-hover:bg-[#eff6ff] group-hover:text-[#0051d5] active:scale-95"
        aria-label={
          score !== null
            ? `View ${product.name}, score ${score.toLocaleString("en-US")}`
            : `View ${product.name}`
        }
      >
        <ArrowUp className="h-5 w-5" aria-hidden />
        {score !== null ? (
          <span className="text-sm font-bold leading-none">
            {score.toLocaleString("en-US")}
          </span>
        ) : null}
      </Link>
    </article>
  )
}

export function BrowseProductRows({
  products,
}: {
  products: ProductCardBase[]
}) {
  const items = products.map((product) => toProductCardItem(product))
  const lastSponsoredIndex = items.reduce(
    (lastIndex, item, index) =>
      Boolean(item.sponsored ?? item.isSponsored) ? index : lastIndex,
    -1,
  )
  const adBoundaryIndex = lastSponsoredIndex >= 0 ? lastSponsoredIndex : 0

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Fragment key={item.id}>
          <BrowseProductRow product={item} />
          {index === adBoundaryIndex ? <GoogleAdsenseUnit /> : null}
        </Fragment>
      ))}
    </div>
  )
}
