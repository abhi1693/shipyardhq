import fs from "fs"
import path from "path"

import { PrismaClient } from "@/lib/vendor/prisma/client"
import { IS_PROD } from "@/lib/constants"
import { PrismaPg } from "@prisma/adapter-pg"
import { loadEnvConfig } from "@next/env"
import type { PoolConfig } from "pg"

// if .env.local exists, load it
const projectRoot = process.cwd()
const envLocalPath = path.join(projectRoot, ".env.local")

if (fs.existsSync(envLocalPath)) {
  loadEnvConfig(projectRoot)
}

const directDatabaseUrl =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL

if (!directDatabaseUrl) {
  throw new Error(
    "DATABASE_URL (or DIRECT_DATABASE_URL) must be set to initialize Prisma.",
  )
}

function readOptionalPositiveIntegerEnv(name: string): number | undefined {
  const raw = process.env[name]?.trim()
  if (!raw) return undefined

  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer when set.`)
  }

  return value
}

function createPoolConfig(): PoolConfig {
  const config: PoolConfig = {
    connectionString: directDatabaseUrl,
  }

  const max = readOptionalPositiveIntegerEnv("PG_POOL_MAX")
  if (max !== undefined) config.max = max

  const idleTimeoutMillis = readOptionalPositiveIntegerEnv(
    "PG_POOL_IDLE_TIMEOUT_MS",
  )
  if (idleTimeoutMillis !== undefined) {
    config.idleTimeoutMillis = idleTimeoutMillis
  }

  const connectionTimeoutMillis = readOptionalPositiveIntegerEnv(
    "PG_POOL_CONNECTION_TIMEOUT_MS",
  )
  if (connectionTimeoutMillis !== undefined) {
    config.connectionTimeoutMillis = connectionTimeoutMillis
  }

  const applicationName = process.env.PG_APPLICATION_NAME?.trim()
  if (applicationName) config.application_name = applicationName

  return config
}

const createPrismaClient = (): PrismaClient => {
  const adapter = new PrismaPg(createPoolConfig())
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
}

const prisma = globalForPrisma.prisma || createPrismaClient()

if (!IS_PROD) {
  globalForPrisma.prisma = prisma
}

export default prisma
