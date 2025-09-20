describe("Homepage discovery journey", () => {
  it("welcomes a curious founder and highlights key discovery paths", () => {
    cy.story("Morgan lands on the homepage to gauge Shipyard HQ's momentum.")
    cy.visit("/")

    cy.contains("Set sail to your next product launch.").should("be.visible")
    cy.contains("Shipyard Fleet").should("be.visible")

    cy.story("They scan the hero stats to see whether the platform has real traction.")
    cy.contains("Products Listed").should("be.visible")
    cy.contains("Makers Onboard").should("be.visible")
    cy.contains("Community Upvotes").should("be.visible")

    cy.story("Morgan scrolls to the featured fleet for standout launches.")
    cy.contains("Highlights From the Helm").scrollIntoView().should("be.visible")
    cy.contains("View all").should("exist")

    cy.story("They continue to the spotlight carousel to spot rising ships.")
    cy.contains("Harbor Spotlight").scrollIntoView().should("be.visible")
    cy.contains("Harbor Picks").should("be.visible")

    cy.story("Morgan checks category guides to chart a research plan.")
    cy.contains("Chart Your Course").scrollIntoView().should("be.visible")
    cy.get('a[href^="/categories/"]')
      .its("length")
      .should("be.greaterThan", 0)

    cy.story("Before leaving, Morgan checks the onboarding call to action.")
    cy.contains("Join the crew").scrollIntoView()
    cy.contains("Signal the Lighthouse").should("be.visible")
  })
})
