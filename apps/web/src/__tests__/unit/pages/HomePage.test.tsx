/**
 * Tests unitaires pour la page d'accueil (HomePage).
 * Bug #9 — Vérifie que le bouton « Voir le calendrier complet » pointe vers /calendar.
 */

jest.mock("@/store/authStore", () => ({
  useAuthStore: () => ({
    user: { pseudo: "TestUser" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/useCalendar", () => ({
  useCalendar: () => ({ data: null, isLoading: false }),
}));

jest.mock("@/hooks/api/useDashboard", () => ({
  useRecentWatches: () => ({ data: null }),
  useFollowedSeries: () => ({ data: null }),
  usePopularTitles: () => ({ data: null }),
  useRecommendations: () => ({ data: null }),
}));

jest.mock("@/hooks/api/useTitles", () => ({
  useTrendingTitles: () => ({ data: null, isLoading: false }),
}));

jest.mock("@/hooks/api/useLists", () => ({
  useLists: () => ({ data: null }),
}));

import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("affiche le bouton Voir le calendrier complet avec href /calendar", () => {
    render(<HomePage />);
    const calendarLink = screen.getByRole("link", {
      name: /Voir le calendrier complet/i,
    });
    expect(calendarLink).toHaveAttribute("href", "/calendar");
  });
});
