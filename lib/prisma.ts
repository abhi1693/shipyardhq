import fs from "fs"
import path from "path"

import { PrismaClient } from "@/lib/vendor/prisma/client"
import { IS_PROD } from "@/lib/constants"
import { PrismaPg } from "@prisma/adapter-pg"
import { withAccelerate } from "@prisma/extension-accelerate"
import { loadEnvConfig } from "@next/env"

// if .env.local exists, load it
const projectRoot = process.cwd()
const envLocalPath = path.join(projectRoot, ".env.local")

if (fs.existsSync(envLocalPath)) {
  loadEnvConfig(projectRoot)
}

const accelerateUrl = process.env.DATABASE_URL
const directDatabaseUrl =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL

if (!directDatabaseUrl) {
  throw new Error(
    "DATABASE_URL (or DIRECT_DATABASE_URL) must be set to initialize Prisma.",
  )
}

const isAccelerateUrl =
  typeof accelerateUrl === "string" &&
  (accelerateUrl.startsWith("prisma://") ||
    accelerateUrl.startsWith("prisma+postgres://"))

const createPrismaClient = () => {
  if (isAccelerateUrl && accelerateUrl) {
    return new PrismaClient({ accelerateUrl }).$extends(withAccelerate())
  }

  const adapter = new PrismaPg({ connectionString: directDatabaseUrl })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient>
}

const prisma = globalForPrisma.prisma || createPrismaClient()

if (!IS_PROD) {
  globalForPrisma.prisma = prisma
}

export default prisma
