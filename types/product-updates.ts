export type ProductUpdateStatusValue = "draft" | "published"

export type ProductUpdateAuthor = {
  id: string
  firstName: string | null
  lastName: string | null
  displayName: string | null
} | null

export type ProductUpdateManageView = {
  id: string
  title: string
  summary: string | null
  content: string
  status: ProductUpdateStatusValue
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  author: ProductUpdateAuthor
}

export type ProductUpdatePublicView = {
  id: string
  title: string
  summary: string | null
  content: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  author: ProductUpdateAuthor
  product?: {
    id: string
    name: string
    slug: string
    logo: string | null
    tagline: string | null
  } | null
}

export type ProductUpdateFeedItem = {
  id: string
  title: string
  summary: string | null
  publishedAt: string | null
  createdAt: string
  product: {
    id: string
    name: string
    slug: string
    logo: string | null
    tagline: string | null
  }
}
