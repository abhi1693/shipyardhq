import { MEMBER_ONBOARDING_PATH, MEMBER_OVERVIEW_PATH } from "../../lib/routes"

const ROLE_OPTION_LABEL = "Launch a product"
const HEARD_FROM_LABEL = "Twitter/X"

describe("Member onboarding flow", () => {
  before(() => {
    if (!Cypress.env("HAS_DATABASE")) {
      return
    }

    return cy.resetDatabase().then(() => cy.task("resetTestUserOnboarding"))
  })

  it("directs first-time members through onboarding and lands them on the hub", function () {
    if (!Cypress.env("HAS_DATABASE")) {
      cy.log("Skipping onboarding flow: database not configured for Cypress.")
      this.skip()
    }

    cy.story("Sign in and arrive on the onboarding form")
    cy.signInTestUser({ afterSignInPath: MEMBER_ONBOARDING_PATH })

    cy.url().should("include", MEMBER_ONBOARDING_PATH)
    cy.contains("Complete Onboarding").should("be.visible")

    cy.story("Select mission focus and discovery channel")
    cy.contains(ROLE_OPTION_LABEL).click()
    cy.contains(HEARD_FROM_LABEL).click()

    cy.story("Submit onboarding details")
    cy.contains("Complete Onboarding").click()

    cy.contains("Welcome aboard!", { timeout: 10000 }).should("be.visible")
    cy.waitForAppIdle()

    cy.story("Members are routed into the command deck")
    cy.url().should("include", MEMBER_OVERVIEW_PATH)
    cy.contains("Member Command Deck", { timeout: 10000 }).should("be.visible")

    cy.story("Revisiting onboarding bounces back to the hub")
    cy.visit(MEMBER_ONBOARDING_PATH)
    cy.url().should("include", MEMBER_OVERVIEW_PATH)
  })
})
