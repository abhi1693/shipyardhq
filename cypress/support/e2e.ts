// ***********************************************************
// This support file is processed automatically before spec files.
// We use it to register custom commands and an accessible
// step logger so our specs read like a story in the Cypress UI.
// ***********************************************************

/// <reference types="cypress" />

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
    }
  }
}

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

export {}
