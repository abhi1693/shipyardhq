import { clerkSetup } from "@clerk/testing/cypress"
import { defineConfig } from "cypress"
import { config as loadEnv } from "dotenv"
loadEnv({ path: ".env.local" })
loadEnv()

const TEST_USER_EMAIL =
  process.env.CYPRESS_TEST_USER_EMAIL?.trim() || "cypress@test.com"

export default defineConfig({
  viewportWidth: 1440,
  viewportHeight: 900,
  video: false,
  screenshotOnRunFailure: true,
  taskTimeout: 240_000,
  retries: {
    runMode: 1,
    openMode: 0,
  },
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    async setupNodeEvents(on, config) {
      const hasDatabase = Boolean(process.env.DATABASE_URL)
      const tasks: Record<string, (...args: unknown[]) => unknown> = {}

      config.env = {
        ...config.env,
        HAS_DATABASE: hasDatabase,
      }

      if (hasDatabase) {
        tasks.resetTestUserOnboarding = async () => {
          const prisma = (await import("./lib/prisma")).default

          await prisma.user.updateMany({
            where: { email: TEST_USER_EMAIL },
            data: {
              onboardedAt: null,
              roleIntent: null,
              heardFrom: null,
              status: "active",
              suspendedAt: null,
              terminatedAt: null,
            },
          })

          return null
        }

        tasks.completeTestUserOnboarding = async () => {
          const prisma = (await import("./lib/prisma")).default

          await prisma.user.updateMany({
            where: { email: TEST_USER_EMAIL },
            data: {
              onboardedAt: new Date(),
              roleIntent: "launch-product",
              heardFrom: "twitter",
              status: "active",
              suspendedAt: null,
              terminatedAt: null,
            },
          })

          return null
        }

        tasks.resetDatabaseSchema = async () => {
          const { resetDatabaseSchema } = await import(
            "./cypress/tasks/resetDatabase"
          )
          await resetDatabaseSchema()
          return null
        }

        tasks.seedDatabase = async () => {
          const { seedDatabase } = await import("./cypress/tasks/resetDatabase")
          await seedDatabase()
          return null
        }

        tasks.resetDatabase = async () => {
          const { resetAndSeedDatabase } = await import(
            "./cypress/tasks/resetDatabase"
          )
          await resetAndSeedDatabase()
          return null
        }
      } else {
        tasks.resetTestUserOnboarding = async () => {
          console.warn(
            "resetTestUserOnboarding skipped: DATABASE_URL not configured",
          )
          return null
        }

        tasks.completeTestUserOnboarding = async () => {
          console.warn(
            "completeTestUserOnboarding skipped: DATABASE_URL not configured",
          )
          return null
        }

        tasks.resetDatabaseSchema = async () => {
          console.warn(
            "resetDatabaseSchema skipped: DATABASE_URL not configured",
          )
          return null
        }

        tasks.seedDatabase = async () => {
          console.warn("seedDatabase skipped: DATABASE_URL not configured")
          return null
        }

        tasks.resetDatabase = async () => {
          console.warn("resetDatabase skipped: DATABASE_URL not configured")
          return null
        }
      }

      on("task", tasks)

      return clerkSetup({ config })
    },
  },
})
