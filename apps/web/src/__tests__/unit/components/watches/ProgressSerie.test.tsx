/**
 * Tests unitaires pour ProgressSerie.
 * Phase 4.1 — Watches
 */

import { render, screen } from "@testing-library/react";
import { ProgressSerie } from "@/components/watches/ProgressSerie";

jest.mock("@/hooks/api/useSerieProgress", () => ({
  useSerieProgress: () => ({
    data: [
      { saison: 1, vus: 5, total: 10 },
      { saison: 2, vus: 3, total: 8 },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe("ProgressSerie", () => {
  it("affiche le pourcentage global", () => {
    render(<ProgressSerie titleId="1" />);
    // (5+3)/(10+8) = 8/18 ≈ 44%
    expect(screen.getByText("44%")).toBeInTheDocument();
  });

  it("affiche le total épisodes vus/total", () => {
    render(<ProgressSerie titleId="1" />);
    expect(screen.getByText("8 / 18 épisodes vus")).toBeInTheDocument();
  });

  it("affiche la progression par saison", () => {
    render(<ProgressSerie titleId="1" />);
    expect(screen.getByText("Saison 1")).toBeInTheDocument();
    expect(screen.getByText("Saison 2")).toBeInTheDocument();
    expect(screen.getByText("5/10")).toBeInTheDocument();
    expect(screen.getByText("3/8")).toBeInTheDocument();
  });

  it("affiche un message si aucune donnée", () => {
    jest
      .spyOn(require("@/hooks/api/useSerieProgress"), "useSerieProgress")
      .mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });
    render(<ProgressSerie titleId="1" />);
    expect(
      screen.getByText("Aucune donnée de progression."),
    ).toBeInTheDocument();
  });
});
