import { clerkSetup } from "@clerk/testing/cypress"
import { defineConfig } from "cypress"

export default defineConfig({
  viewportWidth: 1440,
  viewportHeight: 900,
  video: false,
  screenshotOnRunFailure: true,
  retries: {
    runMode: 1,
    openMode: 0,
  },
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    async setupNodeEvents(_on, config) {
      return clerkSetup({ config })
    },
  },
})
