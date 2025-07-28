import { notFound } from "next/navigation"
import { Metadata } from "next"
import { Badge } from "@/components/atoms/badge"
import { CheckCircle, ThumbsUp, ExternalLink } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/ui/formatters"
import { getProductById } from "@/actions/admin/products/actions"

export const metadata: Metadata = {
  title: "Product Details",
  description: "Detailed view of a listed product",
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = await params
  const product = await getProductById(id)
  if (!product) return notFound()

  const isVerified = product.verification?.isVerified
  const stats = product.analytics

  return (
    <div className="px-4 md:px-12 py-10 max-w-5xl mx-auto">
      <div className="flex items-start gap-6">
        <div className="h-16 w-16 rounded-md overflow-hidden border bg-white shrink-0">
          <img
            src={product.logo}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-muted-foreground">{product.tagline}</p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline">{product.category.name}</Badge>
            {isVerified && (
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1 px-2 py-0.5 text-xs">
                <CheckCircle size={12} /> Verified
              </Badge>
            )}
            {product.plan && (
              <Badge variant="outline" className="text-xs">
                Plan: {product.plan.name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex gap-4 flex-wrap text-sm text-muted-foreground">
          <span>Created by: {product.user.email}</span>
          <span>Created: {formatDate(product.createdAt)}</span>
          <span>Last updated: {formatDate(product.updatedAt)}</span>
        </div>

        <div className="flex gap-6 items-center text-sm pt-2">
          <div className="flex items-center gap-1">
            <ThumbsUp size={14} />
            <span>{stats?.upvotes || 0} Upvotes</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{stats?.views || 0} Views</span>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Link href={product.websiteUrl} target="_blank">
            <Badge className="flex items-center gap-1">
              <ExternalLink size={14} /> Website
            </Badge>
          </Link>
          {product.metadata?.demoUrl && (
            <Link href={product.metadata.demoUrl} target="_blank">
              <Badge variant="outline">Live Demo</Badge>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
