import type { Metadata } from "next"
import { Suspense } from "react"

import { ProductDetailPageContent } from "@/components/templates/public/products/detail/page-content"
import { ProductDetailSkeleton } from "@/components/templates/public/products/detail/skeleton"
import { getPublicProductMetaBySlug } from "@/actions/public/products/actions"
import { buildPageMetadata } from "@/lib/metadata"
import { productPath } from "@/lib/routes"

export async function generateMetadata(
  props: Parameters<typeof ProductDetailPageContent>[0],
): Promise<Metadata> {
  const { slug } = await props.params
  const product = await getPublicProductMetaBySlug(slug)
  if (!product) return {}

  const relativeUrl = productPath(product.slug)
  const desc = product.tagline || product.description || undefined
  const imageEntries = (
    [
      product.bannerImage
        ? { url: product.bannerImage, alt: `${product.name} banner` }
        : null,
      product.logo ? { url: product.logo, alt: `${product.name} logo` } : null,
    ] as Array<{ url: string; alt: string } | null>
  )
    .filter((entry): entry is { url: string; alt: string } => Boolean(entry))
    .filter(
      (entry, index, entries) =>
        entries.findIndex((candidate) => candidate.url === entry.url) === index,
    )

  const authorName =
    [product.user?.firstName || "", product.user?.lastName || ""]
      .join(" ")
      .trim() || undefined

  const openGraphExtras = {
    url: relativeUrl,
    type: "website" as const,
    ...(imageEntries.length ? { images: imageEntries } : {}),
  }

  const twitterExtras = {
    card: "summary_large_image" as const,
    ...(imageEntries.length
      ? {
          images: imageEntries.map(({ url, alt }) => ({ url, alt })),
        }
      : {}),
  }

  const baseMetadata = buildPageMetadata({
    title: product.name,
    section: "Product",
    description: desc,
    openGraph: openGraphExtras,
    twitter: twitterExtras,
  })

  const robotsConfig =
    product.status === "published"
      ? { index: true, follow: true }
      : { index: false, follow: false }

  const keywords =
    product.keywords && product.keywords.length ? product.keywords : undefined

  return {
    ...baseMetadata,
    alternates: { canonical: relativeUrl },
    robots: robotsConfig,
    ...(keywords ? { keywords } : {}),
    ...(authorName ? { authors: [{ name: authorName }] } : {}),
  }
}

export default function ProductDetailPage(
  props: Parameters<typeof ProductDetailPageContent>[0],
) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailPageContent {...props} />
    </Suspense>
  )
}
