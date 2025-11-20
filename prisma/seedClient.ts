import { PrismaClient } from "@/lib/vendor/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

export function createSeedPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL (or DIRECT_DATABASE_URL) must be set to seed the database.",
    )
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}
