import { MEMBER_OVERVIEW_PATH } from "../../lib/routes"

describe("Member overview command deck", () => {
  it("lets a signed-in maker review their portfolio health", () => {
    cy.story("Jamie signs in to their member command deck.")
    cy.signInTestUser({ afterSignInPath: MEMBER_OVERVIEW_PATH })

    cy.story("They land on the overview hero with their next best step.")
    cy.url().should("include", MEMBER_OVERVIEW_PATH)
    cy.contains("Member Command Deck").should("be.visible")
    cy.contains("Next best step").should("be.visible")

    cy.story("Jamie reviews the at-a-glance metrics for their fleet.")
    cy.contains("At a glance").scrollIntoView().should("be.visible")
    cy.contains("New products").should("be.visible")
    cy.contains("Drafts waiting").should("be.visible")

    cy.story("They plan their work from the operations section.")
    cy.contains("Operations").scrollIntoView().should("be.visible")
    cy.contains("Quick shortcuts").should("be.visible")
    cy.contains("Verify domains").should("be.visible")
    cy.contains("Finish drafts").should("be.visible")
    cy.contains("Add visuals").should("be.visible")
    cy.contains("Expiring badges").should("be.visible")

    cy.story("They scan top performers and recent activity before moving on.")
    cy.contains("Top performers").scrollIntoView().should("be.visible")
    cy.contains("Most clicked").should("be.visible")
    cy.contains("Most upvoted").should("be.visible")

    cy.contains("Performance pulse").scrollIntoView().should("be.visible")
    cy.contains("Recent launches").should("be.visible")
    cy.contains("Recent activity").should("be.visible")
    cy.contains("Product health").should("be.visible")
  })
})
