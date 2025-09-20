import { PrismaClient } from "@/lib/vendor/prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"
import { IS_PROD } from "@/lib/constants"
import { withOptimize } from "@prisma/extension-optimize"

function createPrismaClient() {
  return new PrismaClient()
    .$extends(
      withOptimize({
        apiKey: process.env.PRISMA_OPTIMIZE_TOKEN!,
      }),
    )
    .$extends(withAccelerate())
}

type PrismaClientWithExtensions = ReturnType<typeof createPrismaClient>

const globalForPrisma = global as unknown as {
  prisma: PrismaClientWithExtensions | undefined
}

const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (!IS_PROD) globalForPrisma.prisma = prisma

export default prisma
