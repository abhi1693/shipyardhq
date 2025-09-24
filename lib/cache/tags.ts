export const TAGS = {
  products: "products",
  product: (idOrSlug: string) => `product:${idOrSlug}`,
  categories: "categories",
  category: (idOrSlug: string) => `category:${idOrSlug}`,
  useCases: "use-cases",
  usecase: (idOrSlug: string) => `use-case:${idOrSlug}`,
  users: "users",
  user: (id: string) => `user:${id}`,
  organizations: "organizations",
  organization: (id: string) => `organization:${id}`,
  badges: "badges",
  featured: "featured",
  trending: "trending",
  leaderboard: "leaderboard",
  monthlyLeaderboard: "leaderboard:monthly",
  monthlyLeaderboardMonth: (monthKey: string) =>
    `leaderboard:monthly:${monthKey}`,
  analytics: "analytics",
  plans: "plans",
  planFeature: (key: string) => `plan-feature:${key}`,
  upvotes: "upvotes",
  feedback: "feedback",
  subscriptions: "subscriptions",
} as const

export type Tag = (typeof TAGS)[keyof typeof TAGS] | string
