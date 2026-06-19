import { Prisma } from "@/lib/vendor/prisma/client"

export function buildPublicDiscoveryProductWhere(
  where?: Prisma.ProductWhereInput | null,
): Prisma.ProductWhereInput {
  const andFilters: Prisma.ProductWhereInput[] = [{ status: "published" }]

  if (where && Object.keys(where).length > 0) {
    andFilters.push(where)
  }

  return { AND: andFilters }
}

export function buildPublicDiscoverySqlFilter(_alias: "p" = "p"): Prisma.Sql {
  void _alias
  return Prisma.sql``
}
