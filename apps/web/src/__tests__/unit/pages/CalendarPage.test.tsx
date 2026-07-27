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

jest.mock("@/components/watches/CalendarEpisodes", () => ({
  CalendarEpisodes: () => <div data-testid="calendar-episodes">Calendar</div>,
}));

import { render, screen } from "@testing-library/react";
import CalendarPage from "@/app/calendar/page";

describe("CalendarPage", () => {
  it("affiche le titre Calendrier", () => {
    render(<CalendarPage />);
    expect(screen.getByText("Calendrier")).toBeInTheDocument();
  });

  it("affiche le composant CalendarEpisodes", () => {
    render(<CalendarPage />);
    expect(screen.getByTestId("calendar-episodes")).toBeInTheDocument();
  });
});
