// ***********************************************************
// This support file is processed automatically before spec files.
// We use it to register custom commands and an accessible
// step logger so our specs read like a story in the Cypress UI.
// ***********************************************************

/// <reference types="cypress" />

import { addClerkCommands } from "@clerk/testing/cypress"

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
  const { homePath = "/", afterSignInPath = "/member" } = options

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
