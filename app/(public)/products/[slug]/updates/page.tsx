import type { Metadata } from "next"
import { Suspense } from "react"

import {
  ProductUpdatesArchivePageContent,
} from "@/components/templates/public/products/updates/page-content"
import { ProductUpdatesArchiveSkeleton } from "@/components/templates/public/products/updates/skeleton"
import prisma from "@/lib/prisma"
import { ProductStatus } from "@/lib/vendor/prisma/client"
import { buildPageMetadata } from "@/lib/metadata"
import { productUpdatesPath } from "@/lib/routes"

export async function generateMetadata(
  props: Parameters<typeof ProductUpdatesArchivePageContent>[0],
): Promise<Metadata> {
  const { slug } = await props.params

  const product = await prisma.product.findFirst({
    where: { slug, status: ProductStatus.published },
    select: { name: true, tagline: true },
  })

  if (!product) {
    return buildPageMetadata({
      title: "Product updates",
      description: "Latest product updates and release notes.",
    })
  }

  return buildPageMetadata({
    title: `${product.name} · Product updates`,
    description:
      product.tagline ??
      `Latest announcements, improvements, and changelog for ${product.name}.`,
    canonical: productUpdatesPath(slug),
  })
}

export default function ProductUpdatesArchivePage(
  props: Parameters<typeof ProductUpdatesArchivePageContent>[0],
) {
  return (
    <Suspense fallback={<ProductUpdatesArchiveSkeleton />}>
      <ProductUpdatesArchivePageContent {...props} />
    </Suspense>
  )
}
