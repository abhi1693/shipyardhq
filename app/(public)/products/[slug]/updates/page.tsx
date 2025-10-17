import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import prisma from "@/lib/prisma"
import { ProductStatus } from "@/lib/vendor/prisma/client"
import { getPublicProductUpdatesPage } from "@/actions/public/product-updates/actions"
import { ProductUpdatesArchive } from "@/components/pages/ProductUpdatesArchive"
import { Button } from "@/components/atoms/button"
import { productPath } from "@/lib/routes"

const PAGE_SIZE = 10

export default async function ProductUpdatesArchivePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const product = await prisma.product.findFirst({
    where: { slug, status: ProductStatus.published },
    select: { id: true, name: true, slug: true, tagline: true, logo: true },
  })

  if (!product) {
    return notFound()
  }

  const { updates, hasMore } = await getPublicProductUpdatesPage(
    product.id,
    0,
    PAGE_SIZE,
  )

  const loadMoreUpdates = async (page: number) => {
    "use server"
    const result = await getPublicProductUpdatesPage(
      product.id,
      page,
      PAGE_SIZE,
    )
    return {
      updates: result.updates,
      hasMore: result.hasMore,
    }
  }

  return (
    <main className="relative isolate bg-white">
      <div className="relative mx-auto w-full max-w-[120rem] px-4 pb-24 pt-12 md:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
          <header className="rounded-3xl border border-border/70 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {product.logo ? (
                <Image
                  src={product.logo}
                  alt={`${product.name} logo`}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-lg border border-border object-contain"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-sm font-semibold uppercase text-muted-foreground">
                  {product.name.slice(0, 2)}
                </div>
              )}
              <div className="flex-1 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Product updates
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {product.name}
                </h1>
                {product.tagline ? (
                  <p className="text-sm text-muted-foreground">
                    {product.tagline}
                  </p>
                ) : null}
                <Button asChild variant="outline" size="sm">
                  <Link href={productPath(product.slug)}>Back to product</Link>
                </Button>
              </div>
            </div>
          </header>

          <ProductUpdatesArchive
            productName={product.name}
            initialUpdates={updates}
            initialHasMore={hasMore}
            loadMoreAction={loadMoreUpdates}
          />
        </div>
      </div>
    </main>
  )
}
