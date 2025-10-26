import { notFound } from "next/navigation"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { getAlternativeProductById } from "@/actions/admin/alternative-products/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { adminPath } from "@/lib/routes"
import { formatDate } from "@/lib/ui/formatters"
import { AlternativeProductProductRelationship } from "./relationships/products"
import { AlternativeProductCategoryRelationship } from "./relationships/categories"
import { Badge } from "@/components/atoms/badge"
import { Prisma } from "@/lib/vendor/prisma/client"

type AlternativeWithRelations = Prisma.AlternativeProductGetPayload<{
  include: {
    categories: true
    products: {
      include: { category: true }
    }
  }
}>

export default async function AlternativeProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const alternative = await getAlternativeProductById(id)

  if (!alternative) {
    return notFound()
  }

  const alternativeWithRelations = alternative as AlternativeWithRelations
  const categories = alternativeWithRelations.categories
  const products = alternativeWithRelations.products

  const websiteHost = (() => {
    try {
      return new URL(alternativeWithRelations.websiteUrl).hostname
    } catch {
      return alternativeWithRelations.websiteUrl
    }
  })()

  const overview = [
    {
      label: "Website",
      value: (
        <Link
          href={alternativeWithRelations.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          {websiteHost}
          <ExternalLink className="h-4 w-4" />
        </Link>
      ),
    },
    {
      label: "Description",
      value: (
        <p className="whitespace-pre-wrap text-sm">
          {alternativeWithRelations.description}
        </p>
      ),
    },
    {
      label: "Categories",
      value:
        categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge key={category.id} variant="outline">
                <Link
                  href={adminPath("categories", category.id)}
                  className="hover:underline"
                >
                  {category.name}
                </Link>
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      label: "Linked products",
      value: products.length,
    },
    {
      label: "Last updated",
      value: formatDate(alternativeWithRelations.updatedAt),
    },
    {
      label: "Logo",
      value: (
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={alternativeWithRelations.logoUrl}
              alt={`${alternativeWithRelations.name} logo`}
              className="h-full w-full object-contain bg-white"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {alternativeWithRelations.logoUrl}
          </span>
        </div>
      ),
    },
  ]

  return (
    <ObjectPageLayout
      heading={{
        id: alternativeWithRelations.id,
        title: alternativeWithRelations.name,
        createdAt: alternativeWithRelations.createdAt,
        updatedAt: alternativeWithRelations.updatedAt,
        slug: alternativeWithRelations.slug,
      }}
      overview={overview}
      basePath="admin/products/alternatives"
      deletable
      editable
      relationships={
        <>
          <AlternativeProductProductRelationship rows={products} />
          <AlternativeProductCategoryRelationship rows={categories} />
        </>
      }
    />
  )
}
