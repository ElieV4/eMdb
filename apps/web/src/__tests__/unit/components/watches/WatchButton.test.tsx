/**
 * Tests unitaires pour WatchButton.
 * Phase 4.1 — Watches / modification M (état machine unifiée).
 */

jest.mock("@/hooks/api/useCreateWatch", () => ({
  useCreateWatch: () => ({
    mutate: jest.fn((_data, opts) => opts?.onSuccess?.()),
    mutateAsync: jest.fn(() => Promise.resolve()),
    isPending: false,
  }),
}));

jest.mock("@/hooks/api/useDeleteWatch", () => ({
  useDeleteWatch: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/hooks/api/useDeleteAllWatches", () => ({
  useDeleteAllWatches: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/hooks/api/useDeleteAllWatchesByEpisode", () => ({
  useDeleteAllWatchesByEpisode: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/hooks/api/useMarkWatchedUntilEpisode", () => ({
  useMarkWatchedUntilEpisode: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/queryClient";
import { WatchButton } from "@/components/watches/WatchButton";

function renderWithClient(ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("WatchButton", () => {
  it("affiche le bouton 'Marquer comme vu' quand non vu", () => {
    renderWithClient(<WatchButton titleId="1" watches={[]} />);
    expect(screen.getByText("Marquer comme vu")).toBeInTheDocument();
  });

  it("affiche 'Vu' quand un visionnage existe", () => {
    renderWithClient(
      <WatchButton titleId="1" watches={[{ id: "w1", date_vue: "2026-01-01" }]} />,
    );
    expect(screen.getByText("Vu")).toBeInTheDocument();
  });

  it("affiche 'Vu x2' quand deux visionnages existent", () => {
    renderWithClient(
      <WatchButton
        titleId="1"
        watches={[
          { id: "w1", date_vue: "2026-01-01" },
          { id: "w2", date_vue: "2026-01-02" },
        ]}
      />,
    );
    expect(screen.getByText("Vu x2")).toBeInTheDocument();
  });

  it("ouvre le dropdown de dates au clic simple quand non vu", async () => {
    renderWithClient(<WatchButton titleId="1" watches={[]} />);
    fireEvent.click(screen.getByText("Marquer comme vu"));

    await waitFor(() => {
      expect(screen.getByText("Vu à l'instant")).toBeInTheDocument();
    });
  });

  it("appelle createWatch en sélectionnant 'Vu à l'instant' dans le dropdown", async () => {
    const mutate = jest.fn((_data, opts) => opts?.onSuccess?.());
    jest
      .spyOn(require("@/hooks/api/useCreateWatch"), "useCreateWatch")
      .mockReturnValue({ mutate, mutateAsync: jest.fn(), isPending: false });

    renderWithClient(<WatchButton titleId="1" watches={[]} />);
    fireEvent.click(screen.getByText("Marquer comme vu"));

    await waitFor(() => {
      expect(screen.getByText("Vu à l'instant")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Vu à l'instant"));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledTimes(1);
    });
  });

  it("ouvre le dropdown (Revoir/Historique/Annuler) au clic simple quand vu", async () => {
    renderWithClient(
      <WatchButton titleId="1" watches={[{ id: "w1", date_vue: "2026-01-01" }]} />,
    );
    fireEvent.click(screen.getByText("Vu"));

    await waitFor(() => {
      expect(screen.getByText("Revoir")).toBeInTheDocument();
      expect(screen.getByText("Gérer l'historique de visionnage")).toBeInTheDocument();
      expect(screen.getByText("Annuler le visionnage")).toBeInTheDocument();
    });
  });
});
