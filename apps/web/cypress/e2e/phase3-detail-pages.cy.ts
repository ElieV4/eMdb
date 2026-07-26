/**
 * Scénarios e2e Cypress pour la Phase 3 — Pages de détail.
 *
 * ⚠️ Ces tests ne sont PAS exécutés en CI (trop lents).
 * À vérifier manuellement avant mise en production.
 *
 * Prérequis : le backend NestJS doit être en cours d'exécution
 * (docker-compose up) et le frontend (npm run dev).
 */

describe("Phase 3 — Pages de détail (titres, personnes, saisons, épisodes)", () => {
  beforeEach(() => {
    // Intercepte les appels API pour des réponses stables
    cy.intercept("GET", "/titles/*", { fixture: "title-detail.json" }).as("titleDetail");
    cy.intercept("GET", "/titles/*/credits", { fixture: "credits.json" }).as("titleCredits");
    cy.intercept("GET", "/titles/*/recommendations", { fixture: "recommendations.json" }).as("titleRecs");
    cy.intercept("GET", "/titles/*/seasons", { fixture: "seasons.json" }).as("seasons");
    cy.intercept("GET", "/people/*", { fixture: "person-detail.json" }).as("personDetail");
    cy.intercept("GET", "/people/*/filmography", { fixture: "filmography.json" }).as("filmography");
    cy.intercept("GET", "/people/*/recommendations", { fixture: "person-recs.json" }).as("personRecs");
    cy.intercept("GET", "/episodes/*", { fixture: "episode-detail.json" }).as("episodeDetail");
    cy.intercept("GET", "/episodes/*/credits", { fixture: "episode-credits.json" }).as("episodeCredits");
    cy.intercept("GET", "/titles/*/seasons/*", { fixture: "season-detail.json" }).as("seasonDetail");
  });

  describe("Page détail titre (GET /titles/:id)", () => {
    it("affiche le titre, la note et le type", () => {
      cy.visit("/titles/title-1");

      cy.contains("Inception").should("be.visible");
      cy.contains("8.7").should("be.visible");
      cy.contains("Film").should("be.visible");
    });

    it("affiche les métadonnées (genres, pays, studios, durée)", () => {
      cy.visit("/titles/title-1");

      cy.contains("Sci-Fi").should("be.visible");
      cy.contains("USA").should("be.visible");
      cy.contains("Warner Bros").should("be.visible");
      cy.contains("148 min").should("be.visible");
    });

    it("affiche la distribution (crédits groupés par rôle)", () => {
      cy.visit("/titles/title-1");

      cy.contains("Distribution").should("be.visible");
      cy.contains("Leonardo DiCaprio").should("be.visible");
    });

    it("affiche les saisons pour une série", () => {
      cy.visit("/titles/serie-1");

      cy.contains("Saisons").should("be.visible");
      cy.contains("Saison 1").should("be.visible");
      cy.contains("10 épisode(s)").should("be.visible");
    });

    it("affiche les recommandations", () => {
      cy.visit("/titles/title-1");

      cy.contains("Recommandations").should("be.visible");
    });

    it("redirige vers 404 pour un titre inexistant", () => {
      cy.intercept("GET", "/titles/nonexistent", { statusCode: 404 }).as("notFound");
      cy.visit("/titles/nonexistent");
      cy.url().should("include", "/not-found");
    });
  });

  describe("Page détail série (GET /titles/:id, type=serie)", () => {
    it("affiche le bouton suivre", () => {
      cy.visit("/titles/serie-1");
      cy.contains("Suivre").should("be.visible");
    });

    it("affiche la liste des saisons", () => {
      cy.visit("/titles/serie-1");
      cy.get("[data-testid='season-card']").should("have.length.gte", 1);
    });
  });

  describe("Page détail personne (GET /people/:id)", () => {
    it("affiche le nom et la bio", () => {
      cy.visit("/people/person-1");

      cy.contains("Leonardo DiCaprio").should("be.visible");
      cy.contains("Un acteur célèbre.").should("be.visible");
    });

    it("affiche le lien Wikipedia", () => {
      cy.visit("/people/person-1");
      cy.contains("Voir la page Wikipedia").should("have.attr", "href");
    });

    it("affiche la filmographie groupée par rôle", () => {
      cy.visit("/people/person-1");

      cy.contains("Filmographie").should("be.visible");
      cy.contains("Acteur").should("be.visible");
    });

    it("affiche les personnes connexes (recommendations)", () => {
      cy.visit("/people/person-1");
      cy.contains("Personnes connexes").should("be.visible");
    });
  });

  describe("Page saison (GET /titles/:titleId/seasons/:numero)", () => {
    it("affiche le header de la saison", () => {
      cy.visit("/series/serie-1/seasons/1");

      cy.contains("Saison 1").should("be.visible");
    });

    it("affiche la liste des épisodes", () => {
      cy.visit("/series/serie-1/seasons/1");

      cy.contains("Épisodes").should("be.visible");
      cy.get("[data-testid='episode-row'], [data-testid='episode-card']").should(
        "have.length.gte",
        1,
      );
    });

    it("affiche le lien de retour vers la série", () => {
      cy.visit("/series/serie-1/seasons/1");
      cy.contains("Retour à la série").should("have.attr", "href", "/titles/serie-1");
    });
  });

  describe("Page épisode (GET /episodes/:id)", () => {
    it("affiche le titre et les métadonnées", () => {
      cy.visit("/episodes/ep-1");

      cy.contains("The Vanishing of Will Byers").should("be.visible");
      cy.contains("Saison 1").should("be.visible");
      cy.contains("Épisode 1").should("be.visible");
    });

    it("affiche le casting de l'épisode", () => {
      cy.visit("/episodes/ep-1");
      cy.contains("Casting de l'épisode").should("be.visible");
    });

    it("affiche le lien de retour vers la saison", () => {
      cy.visit("/episodes/ep-1");
      cy.contains("Retour à la saison").should("have.attr", "href");
    });
  });

  describe("Navigation entre pages", () => {
    it("navigue depuis la page titre vers une saison", () => {
      cy.visit("/titles/serie-1");
      cy.contains("Saison 1").click();
      cy.url().should("include", "/seasons/1");
    });

    it("navigue depuis la page saison vers un épisode", () => {
      cy.visit("/series/serie-1/seasons/1");
      cy.get("[data-testid='episode-row'] a, [data-testid='episode-card'] a")
        .first()
        .click();
      cy.url().should("include", "/episodes/");
    });

    it("navigue depuis la page épisode vers la saison parente", () => {
      cy.visit("/episodes/ep-1");
      cy.contains("Retour à la saison").click();
      cy.url().should("include", "/seasons/");
    });
  });
});
