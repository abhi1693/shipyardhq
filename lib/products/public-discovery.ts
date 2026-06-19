import { Prisma } from "@/lib/vendor/prisma/client"

export const PUBLIC_DISCOVERY_BLOCKED_TEXT_TERMS = [
  "adult video",
  "beeg",
  "bulk whatsapp",
  "download beeg",
  "download thisvid",
  "land buyer",
  "porn",
  "sell az land",
  "sell land fast",
  "thisvid",
  "video downloader",
  "we buy land",
  "we buy michigan land",
  "whatsapp bulk",
  "whatsapp messaging",
  "whatsapp sender",
  "xxx",
] as const

export const PUBLIC_DISCOVERY_BLOCKED_KEYWORDS = [
  "adult",
  "adult video",
  "bulk whatsapp",
  "downloader",
  "land buyer",
  "land buying",
  "porn",
  "video downloader",
  "whatsapp bulk",
  "xxx",
] as const

const textFields = ["name", "tagline", "description"] as const

export function buildPublicDiscoveryTextWhere(): Prisma.ProductWhereInput {
  const blockedTextFilters: Prisma.ProductWhereInput[] =
    PUBLIC_DISCOVERY_BLOCKED_TEXT_TERMS.map((term) => ({
      OR: textFields.map((field) => ({
        [field]: { contains: term, mode: "insensitive" },
      })),
    }))

  const blockedKeywordFilters: Prisma.ProductWhereInput[] =
    PUBLIC_DISCOVERY_BLOCKED_KEYWORDS.flatMap((keyword) => [
      { keywords: { has: keyword } },
      { keywords: { has: keyword.toUpperCase() } },
      { keywords: { has: titleCase(keyword) } },
    ])

  return {
    NOT: [...blockedTextFilters, ...blockedKeywordFilters],
  }
}

export function buildPublicDiscoveryProductWhere(
  where?: Prisma.ProductWhereInput | null,
): Prisma.ProductWhereInput {
  const andFilters: Prisma.ProductWhereInput[] = [
    { status: "published" },
    buildPublicDiscoveryTextWhere(),
  ]

  if (where && Object.keys(where).length > 0) {
    andFilters.push(where)
  }

  return { AND: andFilters }
}

export function buildPublicDiscoverySqlFilter(alias: "p" = "p"): Prisma.Sql {
  const product = Prisma.raw(alias)
  const blockedTextConditions = PUBLIC_DISCOVERY_BLOCKED_TEXT_TERMS.flatMap(
    (term) =>
      textFields.map((field) => {
        const column = Prisma.raw(`"${field}"`)
        return Prisma.sql`LOWER(COALESCE(${product}.${column}, '')) LIKE ${`%${term}%`}`
      }),
  )

  const blockedKeywordValues = Array.from(
    new Set(PUBLIC_DISCOVERY_BLOCKED_KEYWORDS.map((keyword) => keyword)),
  )

  const conditions = [
    ...blockedTextConditions,
    Prisma.sql`EXISTS (
      SELECT 1
      FROM UNNEST(${product}."keywords") AS blocked_keyword
      WHERE LOWER(TRIM(blocked_keyword)) IN (${Prisma.join(
        blockedKeywordValues,
      )})
    )`,
  ]

  return Prisma.sql`AND NOT (${Prisma.join(conditions, " OR ")})`
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`)
    .join(" ")
}
