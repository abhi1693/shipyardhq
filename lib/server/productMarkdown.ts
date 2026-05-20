import {
  getPublicProductBySlug,
  getPublicProductMetaBySlug,
} from "@/actions/public/products/actions"
import { buildProductMarkdownDocument } from "@/lib/server/productMarkdownDocument"

export async function renderProductMarkdownForPath(pathname: string) {
  const match = pathname.match(/^\/products\/([^/]+)\/?$/)
  if (!match) return null

  const slug = decodeURIComponent(match[1])
  const [product, meta] = await Promise.all([
    getPublicProductBySlug(slug),
    getPublicProductMetaBySlug(slug),
  ])

  if (!product || !meta) {
    return null
  }

  return buildProductMarkdownDocument(product, meta)
}
