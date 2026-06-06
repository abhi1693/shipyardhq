import Image from "next/image"
import Link from "next/link"
import { ArrowUp, ImageIcon, TrendingUp } from "lucide-react"

import type { ProductCardBase } from "@/components/molecules/ProductCard"
import { productPath } from "@/lib/routes"

interface BrowseRisingStarsProps {
  products: ProductCardBase[]
}

function ProductLogo({ product }: { product: ProductCardBase }) {
  if (!product.logo) {
    return <ImageIcon className="h-6 w-6 text-[#74777d]" aria-hidden />
  }

  return (
    <Image
      src={product.logo}
      alt={`${product.name} logo`}
      width={48}
      height={48}
      className="h-full w-full object-cover"
    />
  )
}

export function BrowseRisingStars({ products }: BrowseRisingStarsProps) {
  const risingProducts = products
    .slice()
    .sort(
      (a, b) =>
        (b.scoreCount ?? b.analytics?.upvotes ?? 0) -
        (a.scoreCount ?? a.analytics?.upvotes ?? 0),
    )
    .slice(0, 3)

  if (!risingProducts.length) return null

  return (
    <section className="overflow-hidden">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#10b981]/10 text-[#047857]">
            <TrendingUp className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-[#061d31]">
            Rising Stars
          </h2>
        </div>
        <Link
          href="/leaderboard"
          className="shrink-0 text-sm font-bold text-[#0051d5] underline-offset-4 hover:underline"
        >
          View All
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {risingProducts.map((product) => {
          const score =
            typeof product.scoreCount === "number" &&
            Number.isFinite(product.scoreCount)
              ? product.scoreCount
              : 0
          return (
            <Link
              key={product.id}
              href={productPath(product.slug)}
              className="group min-w-0 rounded-lg border border-[#e2e8f0] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#10b981] hover:shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
                  <ProductLogo product={product} />
                </span>
                <span className="flex items-center gap-1 text-sm font-bold text-[#10b981]">
                  <ArrowUp className="h-4 w-4" aria-hidden />
                  {score.toLocaleString("en-US")}
                </span>
              </div>
              <h3 className="truncate text-lg font-bold text-[#061d31] transition group-hover:text-[#0051d5]">
                {product.name}
              </h3>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm text-[#43474c]">
                {product.tagline ||
                  "Discover launch-ready tools from indie makers worldwide."}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="truncate rounded bg-[#f8fafc] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#43474c]">
                  {product.category?.name ?? "Product"}
                </span>
                <span className="text-sm font-bold text-[#0051d5]">
                  View product
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
