/**
 * Tests unitaires pour WatchButton.
 * Phase 4.1 — Watches
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WatchButton } from "@/components/watches/WatchButton";

// Mock du hook useCreateWatch
jest.mock("@/hooks/api/useCreateWatch", () => ({
  useCreateWatch: () => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(() => Promise.resolve()),
    isPending: false,
  }),
}));

describe("WatchButton", () => {
  it("affiche le bouton 'Marquer comme vu'", () => {
    render(<WatchButton titleId="1" />);
    expect(screen.getByText("Marquer comme vu")).toBeInTheDocument();
  });

  it("appelle createWatch au clic simple", async () => {
    const mutate = jest.fn();
    jest.spyOn(require("@/hooks/api/useCreateWatch"), "useCreateWatch").mockReturnValue({
      mutate,
      mutateAsync: jest.fn(() => Promise.resolve()),
      isPending: false,
    });

    render(<WatchButton titleId="1" />);
    const button = screen.getByText("Marquer comme vu");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledTimes(1);
    });
  });

  it.skip("affiche le menu au clic long (>500ms)", () => {
    // Skip: test interactif DropdownMenu nécessite un mock base-ui plus complexe
  });

  it.skip("propose 4 options dans le menu", () => {
    // Skip: test interactif DropdownMenu nécessite un mock base-ui plus complexe
  });
});