import { MEMBER_OVERVIEW_PATH } from "../../lib/routes"

describe("Member overview command deck", () => {
  before(() => {
    if (!Cypress.env("HAS_DATABASE")) {
      return
    }

    return cy.completeTestUserOnboarding()
  })

  it("lets a signed-in maker review their portfolio health", () => {
    cy.story("Jamie signs in to their member command deck.")
    cy.signInTestUser({ afterSignInPath: MEMBER_OVERVIEW_PATH })

    cy.story("They land on the overview hero with context for their next move.")
    cy.url().should("include", MEMBER_OVERVIEW_PATH)
    cy.contains("Member Command Deck").should("be.visible")

    cy.get("body").then(($body) => {
      const pageText = $body.text()
      const isEmptyState = pageText.includes("Welcome aboard")

      if (isEmptyState) {
        cy.story("Jamie is prompted to add their first product.")
        cy.contains("Welcome aboard").should("be.visible")
        cy.contains("Add your first product").should("be.visible")
        cy.contains("Add product").should("be.visible")
        return
      }

      cy.contains(/Welcome back/i).should("be.visible")
      cy.contains("Next best step").should("be.visible")
      cy.contains("7d").should("be.visible")
      cy.contains("Live products").should("be.visible")
      cy.contains("Drafts in queue").should("be.visible")
      cy.contains("Verified rate").should("be.visible")

      cy.story("Jamie reviews the at-a-glance metrics for their fleet.")
      cy.contains("At a glance").scrollIntoView().should("be.visible")
      cy.contains("New products").should("be.visible")
      cy.contains("Drafts waiting").should("be.visible")
      cy.contains("Verified domains").should("be.visible")

      cy.story("They plan their work from the operations section.")
      cy.contains("Operations").scrollIntoView().should("be.visible")
      cy.contains("Quick shortcuts").should("be.visible")
      cy.contains("Verification progress").should("be.visible")
      cy.contains("Verify domains").should("be.visible")
      cy.contains("Finish drafts").should("be.visible")
      cy.contains("Add visuals").should("be.visible")
      cy.contains("Expiring badges").should("be.visible")
      cy.contains("Go to list →").should("be.visible")

      cy.story("They scan top performers and recent activity before moving on.")
      cy.contains("Top performers").scrollIntoView().should("be.visible")
      cy.contains("Most clicked").should("be.visible")
      cy.contains("Most upvoted").should("be.visible")

      cy.story("To wrap up, they review badges, launches, and portfolio health.")
      cy.contains("Performance pulse").scrollIntoView().should("be.visible")
      cy.contains("Fresh off the deck").should("be.visible")
      cy.contains("Manage badges").should("be.visible")
      cy.contains("Recent launches").should("be.visible")
      cy.contains("View all products").should("be.visible")
      cy.contains("Recent activity").should("be.visible")
      cy.contains("Product health").should("be.visible")
    })
  })
})
