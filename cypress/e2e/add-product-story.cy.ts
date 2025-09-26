import {
  MEMBER_ONBOARDING_PATH,
  MEMBER_PRODUCTS_ADD_PATH,
} from "../../lib/routes"

const ROLE_OPTION_LABEL = "Launch a product"
const HEARD_FROM_LABEL = "Twitter/X"

describe("Member adds a new product as a story", () => {
  it(
    "walks a maker from intent to a published product via the wizard",
    function () {
      if (!Cypress.env("HAS_DATABASE")) {
        cy.log(
          "Skipping product creation story: database not configured for Cypress.",
        )
        this.skip()
      }

      const timestamp = Date.now()
      const productName = `Cypress Story Launch ${timestamp}`
      const tagline = "Turn shipyard stories into shipped updates"
      const description = `## Why this launch matters\n\n- Keeps founders aligned\n- Automates the status narrative\n- Celebrates every handoff`
      const websiteUrl = `https://example.com/story-${timestamp}`
      const logoUrl = `https://placehold.co/280x280.png?text=${timestamp}`
      const websiteHost = new URL(websiteUrl).hostname.replace(/^www\./, "")

      const selectCombobox = (label: string) =>
        cy
          .contains('[data-slot="form-item"]', label, { matchCase: false })
          .find('button[role="combobox"]')

      const findTextInput = (label: string) =>
        cy
          .contains('[data-slot="form-label"]', label)
          .closest('[data-slot="form-item"]')
          .find('input')
          .first()

      const findTextarea = (label: string) =>
        cy
          .contains('[data-slot="form-label"]', label)
          .closest('[data-slot="form-item"]')
          .find('textarea')
          .first()

      cy.story("Morgan signs in ready to share a fresh product story.")
      cy.signInTestUser({ afterSignInPath: MEMBER_PRODUCTS_ADD_PATH })

      cy.location("pathname", { timeout: 20000 }).then((pathname) => {
        if (pathname.includes(MEMBER_ONBOARDING_PATH)) {
          cy.story(
            "Morgan completes onboarding to unlock the builder toolkit.",
          )
          cy.contains("Complete Onboarding", { timeout: 10000 }).should(
            "be.visible",
          )
          cy.contains(ROLE_OPTION_LABEL).click()
          cy.contains(HEARD_FROM_LABEL).click()
          cy.contains("Complete Onboarding").click()
          cy.contains("Welcome aboard!", { timeout: 10000 }).should(
            "be.visible",
          )
          cy.waitForAppIdle()
          cy.visit(MEMBER_PRODUCTS_ADD_PATH)
        }
      })

      cy.story("They arrive on the Add Product wizard set to Basics.")
      cy.url().should("include", MEMBER_PRODUCTS_ADD_PATH)
      cy.contains("Add Product").should("be.visible")
      cy.waitForAppIdle()

      cy.story("Morgan fills out the key product details for their launch.")
      findTextInput("Name").clear().type(productName)
      findTextInput("Tagline").clear().type(tagline)
      findTextarea("Description").clear().type(description, {
        parseSpecialCharSequences: false,
      })
      findTextInput("Website URL").clear().type(websiteUrl)
      findTextInput("Keywords").clear().type("story, automation")

      cy.intercept("POST", "/api/uploads", {
        statusCode: 200,
        body: { url: logoUrl },
      }).as("uploadLogo")

      cy.story("They upload a logo to represent the product across Shipyard.")
      cy.get('input[type="file"]').first().selectFile(
        {
          contents: Cypress.Buffer.from("placeholder image"),
          fileName: "logo.png",
          mimeType: "image/png",
        },
        { force: true },
      )
      cy.wait("@uploadLogo")
      cy.contains("Open").should("be.visible")

      cy.story("A focused category keeps discovery aligned.")
      selectCombobox("Category").click()
      cy.contains('[role="option"]', "AI & Machine Learning").click()
      selectCombobox("Category").should(
        "contain.text",
        "AI & Machine Learning",
      )

      cy.story("They mark web makers as the primary platform audience.")
      cy.contains('label', /^web$/i)
        .find('[data-slot="checkbox"]')
        .click()

      cy.contains('button', 'Next').click()

      cy.story("Pricing comes together as a straightforward subscription.")
      selectCombobox("Pricing Model").click()
      cy.contains('[role="option"]', /^Subscription$/i).click()
      findTextInput("Starting Price (cents)").clear().type("2499")
      selectCombobox("Currency Code").click()
      cy.contains('[role="option"]', "USD").click()

      cy.contains('button', 'Next').click()

      cy.story("They review domain verification guidance and continue.")
      cy.contains("Verify Now").should("be.visible")
      cy.contains('button', 'Next').click()

      cy.story("Optional details stay ready for future marketing efforts.")
      findTextInput("GitHub URL").type(
        "https://github.com/shipyardhq/story-launch",
      )
      findTextInput("Demo URL").type(
        `https://example.com/story-${timestamp}/demo`,
      )
      findTextInput("Contact Email").type("morgan@example.com")
      findTextInput("CTA Label").should('be.disabled')
      findTextInput("CTA URL").should('be.disabled')

      cy.contains('button', 'Next').click()

      cy.story("Morgan checks the review summary before publishing.")
      cy.contains("Overview").should("be.visible")
      cy.contains(productName).should("be.visible")

      cy.story("They publish the product to share it with the fleet.")
      cy.contains('button', 'Publish').click()

      cy.story("A celebration modal confirms the successful launch.")
      cy.contains("Congratulations on the new launch!", { timeout: 60000 })
        .should("be.visible")
      cy.contains('button', 'View my products').click()

      cy.story("Their new product overview is ready for follow-up ops work.")
      cy.location("pathname", { timeout: 60000 }).should(
        "match",
        /\/member\/products\/[a-z0-9-]+$/,
      )
      cy.contains('h1', productName).should('be.visible')
      cy.contains(websiteHost).should("be.visible")
      cy.contains('button', 'Edit').should('be.visible')
      cy.url().should("not.include", "celebrate=")

      cy.story("They can pivot into analytics next to keep momentum going.")
    },
  )
})
