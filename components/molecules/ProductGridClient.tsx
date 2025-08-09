"use client"

import { useEffect, useState, useTransition } from "react"
import { ProductCard } from "./ProductCard"
import { Button } from "@/components/atoms/button"
import { Skeleton } from "@/components/atoms/skeleton"

import {
  Category,
  Product,
  ProductAnalytics,
  ProductVerification,
  User,
} from "@prisma/client"
import { loadMoreProducts } from "@/actions/public/browse/loadMore"

type ProductWithMeta = Product & {
  category: Category
  user: User
  analytics: ProductAnalytics | null
  verification: ProductVerification | null
}

interface ProductGridClientProps {
  initialProducts: ProductWithMeta[]
  initialHasMore: boolean
  initialPage: number
  searchParams: {
    useCase?: string
    category?: string
    verified?: boolean
    sort?: string
  }
}

export default function ProductGridClient({
  initialProducts,
  initialHasMore,
  initialPage,
  searchParams,
}: ProductGridClientProps) {
  const [products, setProducts] = useState(initialProducts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(initialPage)
  const [isPending, startTransition] = useTransition()
  
  // Reset state when server-provided props change (filters/sort updated)
  useEffect(() => {
    setProducts(initialProducts)
    setHasMore(initialHasMore)
    setPage(initialPage)
  }, [initialProducts, initialHasMore, initialPage])

  const loadMore = () => {
    startTransition(async () => {
      const result = await loadMoreProducts({
        ...searchParams,
        page,
      })

      setProducts((prev) => [...prev, ...result.products])
      setHasMore(result.hasMore)
      setPage((prev) => prev + 1)
    })
  }

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={{ id: p.id, name: p.name, logo: p.logo, tagline: p.tagline }}
            upvotes={p.analytics?.upvotes ?? 0}
            author={{
              name: `${p.user.firstName ?? ""} ${p.user.lastName ?? ""}`.trim(),
              initial: p.user.firstName?.[0] ?? "U",
            }}
            category={p.category?.name}
            compact
          />
        ))}
        {isPending &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`sk-${i}`} className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="mt-4 h-16 w-full" />
              <div className="mt-4 flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          ))}
      </div>

      {hasMore && (
        <div className="text-center pt-6">
          <Button onClick={loadMore} disabled={isPending}>
            {isPending ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </section>
  )
}
