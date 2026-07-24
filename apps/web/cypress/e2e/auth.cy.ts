/**
 * Scénarios Cypress e2e pour l'authentification.
 * À tester manuellement (non exécutés en CI — trop lents).
 */

describe("Authentication — Login", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("affiche le formulaire de connexion", () => {
    cy.contains("Connexion").should("be.visible");
    cy.get('input[name="email"]').should("exist");
    cy.get('input[name="password"]').should("exist");
    cy.contains("Se connecter").should("exist");
  });

  it("affiche une erreur pour champs vides", () => {
    cy.contains("Se connecter").click();
    cy.contains("L'email est requis").should("be.visible");
    cy.contains("Le mot de passe est requis").should("be.visible");
  });

  it("affiche une erreur pour email invalide", () => {
    cy.get('input[name="email"]').type("invalid-email");
    cy.get('input[name="password"]').type("password123");
    cy.contains("Se connecter").click();
    cy.contains("Format d'email invalide").should("be.visible");
  });

  it("connecte l'utilisateur et redirige vers /", () => {
    cy.intercept("POST", "/auth/login", {
      statusCode: 201,
      body: {
        accessToken: "fake-access-token",
        refreshToken: "fake-refresh-token",
        user: { id: "1", email: "test@test.com", pseudo: "TestUser" },
      },
    }).as("login");

    cy.get('input[name="email"]').type("test@test.com");
    cy.get('input[name="password"]').type("password123");
    cy.contains("Se connecter").click();

    cy.wait("@login");
    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
  });

  it("affiche une erreur 401 pour mauvais credentials", () => {
    cy.intercept("POST", "/auth/login", {
      statusCode: 401,
      body: { message: "Email ou mot de passe invalide" },
    }).as("login");

    cy.get('input[name="email"]').type("wrong@test.com");
    cy.get('input[name="password"]').type("wrongpassword");
    cy.contains("Se connecter").click();

    cy.wait("@login");
    cy.contains("Non autorisé").should("be.visible");
  });

  it("a un lien vers la page d'inscription", () => {
    cy.contains("Créer un compte").should("exist");
    cy.contains("Créer un compte").click();
    cy.url().should("include", "/register");
  });
});

describe("Authentication — Register", () => {
  beforeEach(() => {
    cy.visit("/register");
  });

  it("affiche le formulaire d'inscription", () => {
    cy.contains("Inscription").should("be.visible");
    cy.get('input[name="email"]').should("exist");
    cy.get('input[name="pseudo"]').should("exist");
    cy.get('input[name="password"]').should("exist");
    cy.get('input[name="confirmPassword"]').should("exist");
    cy.contains("Créer le compte").should("exist");
  });

  it("affiche une erreur pour champs vides", () => {
    cy.contains("Créer le compte").click();
    cy.contains("L'email est requis").should("be.visible");
    cy.contains("Le pseudo est requis").should("be.visible");
    cy.contains("Le mot de passe est requis").should("be.visible");
    cy.contains("La confirmation est requise").should("be.visible");
  });

  it("affiche une erreur pour password < 8", () => {
    cy.get('input[name="email"]').type("test@test.com");
    cy.get('input[name="pseudo"]').type("TestUser");
    cy.get('input[name="password"]').type("short");
    cy.get('input[name="confirmPassword"]').type("short");
    cy.contains("Créer le compte").click();
    cy.contains("Le mot de passe doit contenir au moins 8 caractères").should(
      "be.visible",
    );
  });

  it("affiche une erreur pour confirmation qui ne correspond pas", () => {
    cy.get('input[name="email"]').type("test@test.com");
    cy.get('input[name="pseudo"]').type("TestUser");
    cy.get('input[name="password"]').type("password123");
    cy.get('input[name="confirmPassword"]').type("different");
    cy.contains("Créer le compte").click();
    cy.contains("Les mots de passe ne correspondent pas").should("be.visible");
  });

  it("crée le compte et redirige vers /", () => {
    cy.intercept("POST", "/auth/register", {
      statusCode: 201,
      body: {
        accessToken: "fake-access-token",
        refreshToken: "fake-refresh-token",
        user: { id: "1", email: "test@test.com", pseudo: "TestUser" },
      },
    }).as("register");

    cy.get('input[name="email"]').type("test@test.com");
    cy.get('input[name="pseudo"]').type("TestUser");
    cy.get('input[name="password"]').type("password123");
    cy.get('input[name="confirmPassword"]').type("password123");
    cy.contains("Créer le compte").click();

    cy.wait("@register");
    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
  });

  it("affiche une erreur 409 pour email existant", () => {
    cy.intercept("POST", "/auth/register", {
      statusCode: 409,
      body: { message: "Un utilisateur avec cet email existe déjà." },
    }).as("register");

    cy.get('input[name="email"]').type("existing@test.com");
    cy.get('input[name="pseudo"]').type("TestUser");
    cy.get('input[name="password"]').type("password123");
    cy.get('input[name="confirmPassword"]').type("password123");
    cy.contains("Créer le compte").click();

    cy.wait("@register");
    cy.contains("Un utilisateur avec cet email existe déjà.").should(
      "be.visible",
    );
  });

  it("a un lien vers la page de connexion", () => {
    cy.contains("Connectez-vous").should("exist");
    cy.contains("Connectez-vous").click();
    cy.url().should("include", "/login");
  });
});

describe("Authentication — Middleware", () => {
  it("redirige vers /login si route protégée sans cookie", () => {
    cy.visit("/profile");
    cy.url().should("include", "/login");
    cy.url().should("include", "redirect=");
  });
});
