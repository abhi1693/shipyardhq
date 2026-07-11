import { applyCache, DEFAULT_TTL, TAGS } from "@/lib/cache"
import prisma from "@/lib/prisma"
import { buildPublicDiscoveryProductWhere } from "@/lib/products/public-discovery"
import { Prisma } from "@/lib/vendor/prisma/client"

const publicBuilderWhere: Prisma.UserWhereInput = {
  status: "active",
  products: { some: buildPublicDiscoveryProductWhere() },
}

export async function getPublicBuilderCount(): Promise<number> {
  "use cache"
  applyCache([TAGS.homepage, TAGS.users, TAGS.products], DEFAULT_TTL.slow)

  return prisma.user.count({ where: publicBuilderWhere })
}
