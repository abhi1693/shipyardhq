import { PrismaClient } from "@/lib/vendor/prisma/client/edge"
import { IS_PROD } from "@/lib/constants"
import { withAccelerate } from "@prisma/extension-accelerate";
import { withOptimize } from "@prisma/extension-optimize"

const createPrismaClient = () => new PrismaClient().$extends(withOptimize({ apiKey: process.env.PRISMA_OPTIMIZE_TOKEN! })).$extends(withAccelerate());

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient>;
};

const prisma = globalForPrisma.prisma || createPrismaClient();

if (!IS_PROD) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
