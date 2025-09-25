// ***********************************************************
// This support file is processed automatically before spec files.
// We use it to register custom commands and an accessible
// step logger so our specs read like a story in the Cypress UI.
// ***********************************************************

/// <reference types="cypress" />

import { addClerkCommands } from "@clerk/testing/cypress"
import { HOME_PATH, MEMBER_BASE_PATH } from "../../lib/routes"

addClerkCommands({ Cypress, cy })

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Adds a human-readable narrative entry to the Cypress command log.
       */
      story(message: string): Chainable<null>
      /**
       * Waits until the global top-loader has finished or the timeout (60s) elapses.
       */
      waitForAppIdle(): Chainable<null>
      /**
       * Resets the database to the seeded state for deterministic Cypress runs.
       */
      resetDatabase(): Chainable<null>
      /**
       * Drops and recreates the database schema for a clean slate.
       */
      resetDatabaseSchema(): Chainable<null>
      /**
       * Applies the Prisma seed without touching the schema.
       */
      seedDatabase(): Chainable<null>
      /**
       * Marks the dedicated Cypress test user as fully onboarded.
       */
      completeTestUserOnboarding(): Chainable<null>
      /**
       * Boots Clerk and signs in the dedicated Cypress test user.
       */
      signInTestUser(options?: {
        homePath?: string
        afterSignInPath?: string | null
      }): Chainable<void>
    }
  }
}

const CYPRESS_TEST_USER = {
  email: "cypress@test.com",
  password: "HoweverClerk5$",
} as const

Cypress.Commands.add("completeTestUserOnboarding", () => {
  if (!Cypress.env("HAS_DATABASE")) {
    cy.log("Skipping onboarding completion: HAS_DATABASE flag not set")
    return cy.wrap(null, { log: false })
  }

  cy.story("Ensure test user is onboarded")
  cy.task("completeTestUserOnboarding")
  return cy.wrap(null, { log: false })
})

Cypress.Commands.add("resetDatabaseSchema", () => {
  if (!Cypress.env("HAS_DATABASE")) {
    cy.log("Skipping schema reset: HAS_DATABASE flag not set")
    return cy.wrap(null, { log: false })
  }

  cy.story("Reset database schema")
  cy.task("resetDatabaseSchema")
  return cy.wrap(null, { log: false })
})

Cypress.Commands.add("seedDatabase", () => {
  if (!Cypress.env("HAS_DATABASE")) {
    cy.log("Skipping seed: HAS_DATABASE flag not set")
    return cy.wrap(null, { log: false })
  }

  cy.story("Seed database fixtures")
  cy.task("seedDatabase")
  return cy.wrap(null, { log: false })
})

Cypress.Commands.add("resetDatabase", () => {
  if (!Cypress.env("HAS_DATABASE")) {
    cy.log("Skipping database reset: HAS_DATABASE flag not set")
    return cy.wrap(null, { log: false })
  }

  return cy.resetDatabaseSchema().then(() => cy.seedDatabase())
})

Cypress.Commands.add("story", (message: string) => {
  cy.log(`📘 Story — ${message}`)
  return cy.wrap(null, { log: false })
})

Cypress.Commands.add("waitForAppIdle", () => {
  cy.get("body", { timeout: 60_000 }).should(($body) => {
    const busy = $body.hasClass("nprogress-busy")
    const hasBar = $body.find("#nprogress").length > 0
    expect(busy || hasBar, "loading indicator should be idle").to.equal(false)
  })
  return cy.wrap(null, { log: false })
})

Cypress.Commands.add("signInTestUser", (options = {}) => {
  const { homePath = HOME_PATH, afterSignInPath = MEMBER_BASE_PATH } = options

  cy.story(`Boot Clerk on ${homePath}`)
  cy.visit(homePath)
  cy.clerkLoaded()

  cy.story("Sign in as Cypress test user")
  cy.clerkSignIn({
    strategy: "password",
    identifier: CYPRESS_TEST_USER.email,
    password: CYPRESS_TEST_USER.password,
  })

  if (afterSignInPath) {
    cy.story(`Navigate to ${afterSignInPath}`)
    cy.visit(afterSignInPath)
  }

  cy.waitForAppIdle()
})

export {}
