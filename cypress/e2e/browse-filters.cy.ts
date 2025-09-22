import { BROWSE_PATH } from "../../lib/routes"

describe("Browse filtering journey", () => {
  it("helps a researcher explore, expand, and narrow product results", () => {
    cy.story("Jamie opens the browse view to map the landscape.")
    cy.visit(BROWSE_PATH)

    cy.contains("Chart your course through top startups.").should("be.visible")

    cy.story("They load extra rows to widen their scan before filtering.")
    cy.get('[data-testid="product-compact-card"]').then(($cards) => {
      const initialCount = $cards.length
      expect(initialCount).to.be.greaterThan(0)
      cy.contains("button", "Load More")
        .scrollIntoView()
        .should("be.visible")
        .click()
      cy.get('[data-testid="product-card-skeleton"]').should("exist")
      cy.get('[data-testid="product-card-skeleton"]').should("not.exist")
      cy.get('[data-testid="product-compact-card"]').should(($after) => {
        expect($after.length).to.be.greaterThan(initialCount)
      })
    })

    cy.story("Jamie switches to the Launch a SaaS use case to stay focused.")
    cy.get('[data-testid="filter-use-case-trigger"]').click()
    cy.get('[data-testid="use-case-option-launch-saas"]').click()
    cy.waitForAppIdle()
    cy.url().should("include", "useCase=launch-saas")
    cy.get('[data-testid="filter-category-trigger"]').should("be.disabled")

    cy.story(
      "With a new idea brewing, they clear the filters to compare marketing tools.",
    )
    cy.contains("button", "Clear all").click()
    cy.waitForAppIdle()
    cy.url().should("not.include", "useCase=")
    cy.get('[data-testid="filter-category-trigger"]').should("not.be.disabled")

    cy.story(
      "Jamie drills into Social Media Tools to evaluate promotion helpers.",
    )
    cy.get('[data-testid="filter-category-trigger"]').click()
    cy.get('[data-testid="category-option-social-media-tools"]').click()
    cy.waitForAppIdle()
    cy.url().should("include", "category=social-media-tools")
    cy.get('[data-testid="filter-use-case-trigger"]').should("be.disabled")

    cy.story(
      "Satisfied with the slice, they reset to full visibility before leaving.",
    )
    cy.contains("button", "Clear all").click()
    cy.waitForAppIdle()
    cy.url().should("not.include", "category=")
    cy.get('[data-testid="filter-use-case-trigger"]').should("not.be.disabled")
  })
})
