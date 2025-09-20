describe("Leaderboard showcase journey", () => {
  it("walks a maker through the ranking board and its controls", () => {
    cy.story("Riley checks the leaderboard to see who is leading the fleet.")
    cy.visit("/leaderboard")

    cy.contains("Meet the fleet leading the tide").should("be.visible")
    cy.contains("Products competing").should("be.visible")
    cy.contains("High score").should("be.visible")

    cy.story("They adjust the list to focus on the top 25 ships.")
    cy.contains("Tune the tides").scrollIntoView()
    cy.contains("Showing top 50 launches").should("be.visible")
    cy.contains("button", "Top 50").should("be.visible").click()
    cy.get('[data-slot="select-content"]').should("be.visible")
    cy.get('[data-slot="select-item"]').contains("Top 25").click()
    cy.waitForAppIdle()
    cy.contains("button", "Top 25").should("be.visible")
    cy.url().should("include", "limit=25")
    cy.contains("Showing top 25 launches").should("be.visible")

    cy.story(
      "Riley filters to Social Media Tools to benchmark marketing players.",
    )
    cy.contains("button", "All categories")
      .scrollIntoView()
      .should("be.visible")
      .click()
    cy.get('[data-slot="select-content"]').should("be.visible")
    cy.get('[data-slot="select-item"]').contains("Social Media Tools").click()
    cy.waitForAppIdle()
    cy.contains("button", "Social Media Tools").should("be.visible")
    cy.url().should("include", "category=social-media-tools")
    cy.contains("Reset filters").should("be.visible")

    cy.story(
      "They review the flagship card to understand why it's ranking first.",
    )
    cy.contains("Flagship").should("be.visible")
    cy.contains("Rank #1").should("be.visible")
    cy.contains("Ready to climb the leaderboard?")
      .scrollIntoView()
      .should("be.visible")

    cy.story("Riley resets the board before heading back to browsing.")
    cy.contains("Reset filters").click()
    cy.waitForAppIdle()
    cy.url().should("not.include", "category=")
    cy.url().should("not.include", "limit=25")
  })
})
