/**
 * Configuration Cypress pour le frontend eMDB.
 * Tests e2e — non exécutés en CI (trop lents).
 */

import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
    supportFile: false,
    video: false,
  },
});
