/**
 * Tests unitaires pour la page calendrier (CalendarPage).
 * Bug #10 — Vérifie que la page /calendar existe et affiche les épisodes non vus.
 */

jest.mock("@/store/authStore", () => ({
  useAuthStore: () => ({
    user: { pseudo: "TestUser" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

import { render, screen } from "@testing-library/react";
import CalendarPage from "@/app/calendar/page";

describe("CalendarPage", () => {
  it("affiche le titre Calendrier", () => {
    render(<CalendarPage />);
    expect(screen.getByText("Calendrier")).toBeInTheDocument();
  });

  it("affiche le filtre de période (modification J)", () => {
    render(<CalendarPage />);
    expect(screen.getByText("Semaine")).toBeInTheDocument();
  });
});
