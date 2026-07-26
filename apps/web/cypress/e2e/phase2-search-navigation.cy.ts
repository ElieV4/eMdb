describe("Phase 2 — Search & Navigation", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("loads the homepage with header and footer", () => {
    cy.get("header").should("be.visible");
    cy.get("footer").should("be.visible");
  });

  it("shows welcome CTA for unauthenticated users", () => {
    cy.contains("Se connecter").should("be.visible");
    cy.contains("S'inscrire").should("be.visible");
  });

  it("displays popular titles on the homepage", () => {
    cy.get('[data-testid="popular-titles"]').should("exist");
  });

  context("Search page", () => {
    beforeEach(() => {
      cy.visit("/search");
    });

    it("renders the search page with tabs", () => {
      cy.get('input[placeholder*="rechercher"]').should("be.visible");
    });

    it("shows Film, Série, and Personne tabs", () => {
      cy.contains("Film").should("be.visible");
      cy.contains("Série").should("be.visible");
      cy.contains("Personne").should("be.visible");
    });

    it("displays search results after typing a query", () => {
      cy.get('input[placeholder*="rechercher"]').type("inception");
      cy.wait(500);
      cy.get('[data-testid="search-results"]').should("exist");
    });

    it("navigates to a title page when a TitleCard is clicked", () => {
      cy.get('input[placeholder*="rechercher"]').type("inception");
      cy.wait(500);
      cy.get('a[href*="/titles/"]').first().click();
      cy.url().should("include", "/titles/");
    });

    it("navigates to a person page when a PersonCard is clicked", () => {
      cy.get('input[placeholder*="rechercher"]').type("diCaprio");
      cy.wait(500);
      cy.get('a[href*="/people/"]').first().click();
      cy.url().should("include", "/people/");
    });

    it("supports keyboard navigation in search results", () => {
      cy.get('input[placeholder*="rechercher"]').type("inception");
      cy.wait(500);
      cy.get('input[placeholder*="rechercher"]').focus();
      cy.get("body").type("{downarrow}");
    });
  });

  context("404 page", () => {
    it("shows custom 404 for nonexistent routes", () => {
      cy.visit("/nonexistent-route");
      cy.contains("404").should("be.visible");
    });
  });
});
