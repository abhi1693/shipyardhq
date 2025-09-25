import { BROWSE_PATH } from "../../lib/routes"

describe("Public catalog journey", () => {
  it("guides an indie maker from landing to a confident product decision", () => {
    cy.story(
      "Alex, an indie maker, arrives on Shipyard HQ looking for inspiration.",
    )
    cy.visit("/")

    cy.contains("Set sail to your next product launch.").should("be.visible")
    cy.contains("Submit Your Product").should("be.visible")

    cy.story("They decide to explore what's trending for dev-focused builders.")
    cy.contains("Explore Products").click()
    cy.waitForAppIdle()

    cy.url().should("include", BROWSE_PATH)
    cy.contains("Chart your course through top startups.").should("be.visible")

    cy.story(
      "Alex uses the search bar to pull up a launch a friend recommended.",
    )
    cy.get('[data-testid="browse-search"]').clear().type("ShitPosts")
    cy.waitForAppIdle()
    cy.url().should("include", "q=ShitPosts")

    cy.contains(
      '[data-testid="product-compact-card"] button',
      "ShitPosts",
    ).should("be.visible")

    cy.story("Alex opens the listing to learn more about the launch.")
    cy.contains(
      '[data-testid="product-compact-card"] button',
      "ShitPosts",
    ).click()

    cy.waitForAppIdle()
    cy.url().should("include", "/products/shitposts")

    cy.story("On the product page they look for proof points and next steps.")
    cy.contains("Charted for").should("be.visible")
    cy.contains("Skippered by").should("be.visible")
    cy.contains("Build and share your shitposts").should("be.visible")
    cy.contains("Support this product").should("be.visible")
    cy.contains("Product details").should("be.visible")
    cy.contains("Visit website").should("be.visible")
    cy.contains("Live demo").should("be.visible")
  })
})
