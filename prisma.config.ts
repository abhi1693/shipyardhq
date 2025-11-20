import "dotenv/config"
import { defineConfig } from "prisma/config"

const datasourceUrl =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL

if (!datasourceUrl) {
  throw new Error(
    "DATABASE_URL (or DIRECT_DATABASE_URL) must be set for Prisma CLI commands."
  )
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl,
  },
})
