import Image from "next/image"
import Link from "next/link"
import { ExternalLink, ImageIcon } from "lucide-react"

import type { HomepageFeedItem } from "@/actions/public/homepage/feed"
import { productPath } from "@/lib/routes"
import { cn } from "@/lib/utils"

function ProductImage({ item }: { item: HomepageFeedItem }) {
  if (!item.logo) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#e5eeff] text-[#4c6077]">
        <ImageIcon className="h-10 w-10" aria-hidden />
      </div>
    )
  }

  return (
    <Image
      src={item.logo}
      alt={`${item.name} product image`}
      fill
      sizes="(min-width: 1024px) 370px, (min-width: 768px) 50vw, 100vw"
      className="object-cover transition duration-500 group-hover:scale-105"
    />
  )
}

function ProductCard({ item }: { item: HomepageFeedItem }) {
  const href = productPath(item.slug)
  const tags = [item.category, item.pricingModel]
    .filter(Boolean)
    .map((tag) =>
      String(tag)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    )
    .slice(0, 2)

  return (
    <article className="group overflow-hidden rounded-lg border border-[#e2e8f0] bg-white transition hover:shadow-xl">
      <Link
        href={href}
        className="relative block h-48 overflow-hidden bg-[#e5eeff]"
      >
        <ProductImage item={item} />
        {(item.isSponsored || item.badges.length > 0) && (
          <span className="absolute right-4 top-4 rounded bg-[#f97316] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-lg">
            {item.isSponsored ? "Sponsored" : "Featured Launch"}
          </span>
        )}
      </Link>
      <div className="p-6">
        <div className="mb-2 flex items-start justify-between gap-4">
          <Link
            href={href}
            className="min-w-0 text-2xl font-semibold tracking-tight text-black transition group-hover:text-[#0051d5]"
          >
            {item.name}
          </Link>
        </div>
        <p className="mb-5 text-base leading-7 text-[#43474c]">
          {item.tagline}
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {tags.length ? (
              tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-[#f8fafc] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#43474c]"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="rounded bg-[#f8fafc] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#43474c]">
                Product
              </span>
            )}
          </div>
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0051d5] hover:underline"
          >
            View Project
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function UserProductGrid({
  className,
  items,
}: {
  className?: string
  items: HomepageFeedItem[]
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        items.length > 1 && "md:grid-cols-2",
        className,
      )}
    >
      {items.map((item) => (
        <ProductCard key={item.id} item={item} />
      ))}
    </div>
  )
}

export function EmptyUserProductFeed() {
  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-white p-8 text-center text-sm text-[#43474c]">
      No published products yet. Check back soon.
    </div>
  )
}
