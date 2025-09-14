export const TAGS = {
  products: "products",
  product: (idOrSlug: string) => `product:${idOrSlug}`,
  categories: "categories",
  category: (idOrSlug: string) => `category:${idOrSlug}`,
  users: "users",
  user: (id: string) => `user:${id}`,
  badges: "badges",
  featured: "featured",
  trending: "trending",
  leaderboard: "leaderboard",
  analytics: "analytics",
  plans: "plans",
  planFeature: (key: string) => `plan-feature:${key}`,
} as const

export type Tag = (typeof TAGS)[keyof typeof TAGS] | string
