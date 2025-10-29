describe("Homepage discovery journey", () => {
  it("welcomes a curious founder and highlights key discovery paths", () => {
    cy.story("Morgan lands on the homepage to gauge Shipyard HQ's momentum.")
    cy.visit("/")

    cy.contains("Shipyard launch directory").should("be.visible")
    cy.contains("Flagship homepage spotlight").should("be.visible")

    cy.story(
      "They scan the hero stats to see whether the platform has real traction.",
    )
    cy.contains("Products launched").should("be.visible")
    cy.contains("Builders featured").should("be.visible")
    cy.contains("Community Upvotes").should("be.visible")

    cy.story("Morgan scrolls to featured campaigns for standout launches.")
    cy.contains("Marquee placements that keep your launch in view")
      .scrollIntoView()
      .should("be.visible")
    cy.contains("View all").should("exist")

    cy.story("They continue to the spotlight carousel to spot rising launches.")

    cy.story("Morgan checks sponsor placements to see who's investing.")
    cy.contains("Sponsors")
      .scrollIntoView()
      .should("be.visible")
    cy.contains("Advertise").should("exist")

    cy.story("Before leaving, Morgan checks the onboarding call to action.")
    cy.contains("Join the community").scrollIntoView()
    cy.contains("Ready to plan your next launch?").should("be.visible")
    cy.contains("Submit a launch").should("be.visible")
    cy.contains("Explore products").should("be.visible")
  })
})
