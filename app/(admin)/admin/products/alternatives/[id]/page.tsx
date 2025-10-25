import { notFound } from "next/navigation"

import { getAlternativeProductById } from "@/actions/admin/alternative-products/actions"
import { ObjectPageLayout } from "@/components/layout/object-view/page-layout"
import { adminPath } from "@/lib/routes"
import { formatDate } from "@/lib/ui/formatters"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { AlternativeProductProductRelationship } from "./relationships/products"
import { AlternativeProductCategoryRelationship } from "./relationships/categories"
import { Badge } from "@/components/atoms/badge"

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

  const categories = alternative.categories
  const products = alternative.products

  const websiteHost = (() => {
    try {
      return new URL(alternative.websiteUrl).hostname
    } catch {
      return alternative.websiteUrl
    }
  })()

  const overview = [
    {
      label: "Website",
      value: (
        <Link
          href={alternative.websiteUrl}
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
      value: <p className="whitespace-pre-wrap text-sm">{alternative.description}</p>,
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
      value: formatDate(alternative.updatedAt),
    },
    {
      label: "Logo",
      value: (
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={alternative.logoUrl}
              alt={`${alternative.name} logo`}
              className="h-full w-full object-contain bg-white"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {alternative.logoUrl}
          </span>
        </div>
      ),
    },
  ]

  return (
    <ObjectPageLayout
      heading={{
        id: alternative.id,
        title: alternative.name,
        createdAt: alternative.createdAt,
        updatedAt: alternative.updatedAt,
        slug: null,
      }}
      overview={overview}
      basePath="admin/products/alternatives"
      deletable
      editable
      relationships={
        <>
          <AlternativeProductProductRelationship
            rows={products}
          />
          <AlternativeProductCategoryRelationship
            rows={categories}
          />
        </>
      }
    />
  )
}
