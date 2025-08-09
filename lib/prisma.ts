import { PrismaClient } from "@prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"
import { IS_PROD } from "@/lib/constants"
import {withOptimize} from "@prisma/extension-optimize";

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const prisma =
  globalForPrisma.prisma || new PrismaClient().$extends(withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY || "" })).$extends(withAccelerate())

if (!IS_PROD) globalForPrisma.prisma = prisma

export default prisma
