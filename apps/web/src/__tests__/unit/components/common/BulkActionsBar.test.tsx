/**
 * Tests unitaires pour BulkActionsBar (mode sélection multiple —
 * "Modifier le contenu" sur Continuer à regarder / Watchlist / Historique).
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/queryClient";
import { BulkActionsBar, BulkSelectableItem } from "@/components/common/BulkActionsBar";

function renderBar(ui: React.ReactNode) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const items: BulkSelectableItem[] = [
  { id: "t1", titleId: "t1", type: "serie" },
  { id: "t2", titleId: "t2", type: "film" },
];

describe("BulkActionsBar", () => {
  it("n'affiche rien quand aucun item n'est sélectionné", () => {
    const { container } = renderBar(
      <BulkActionsBar items={[]} watchlistId="w1" favorisId="f1" onDone={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche le nombre d'items sélectionnés", () => {
    renderBar(<BulkActionsBar items={items} watchlistId="w1" favorisId="f1" onDone={jest.fn()} />);
    expect(screen.getByText("2 sélectionnés")).toBeInTheDocument();
  });

  it("liste les actions groupées dans le dropdown, y compris Abandonner la série", async () => {
    const user = userEvent.setup();
    renderBar(<BulkActionsBar items={items} watchlistId="w1" favorisId="f1" onDone={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: /Actions/i }));

    await waitFor(() => expect(screen.getByText("Suivre")).toBeInTheDocument());
    expect(screen.getByText("Ne plus suivre")).toBeInTheDocument();
    expect(screen.getByText("Abandonner la série")).toBeInTheDocument();
    expect(screen.getByText("Ajouter aux favoris")).toBeInTheDocument();
    expect(screen.getByText("Supprimer des favoris")).toBeInTheDocument();
    expect(screen.queryByText("Supprimer de l'historique")).not.toBeInTheDocument();
  });

  it("affiche 'Supprimer de l'historique' uniquement quand allowDeleteHistory est passé", async () => {
    const user = userEvent.setup();
    renderBar(
      <BulkActionsBar
        items={items.map((item) => ({ ...item, watchId: item.id }))}
        watchlistId="w1"
        favorisId="f1"
        allowDeleteHistory
        onDone={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Actions/i }));
    await waitFor(() =>
      expect(screen.getByText("Supprimer de l'historique")).toBeInTheDocument(),
    );
  });

  it("appelle onDone quand on clique sur Annuler", async () => {
    const user = userEvent.setup();
    const onDone = jest.fn();
    renderBar(<BulkActionsBar items={items} watchlistId="w1" favorisId="f1" onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: /Annuler/i }));
    expect(onDone).toHaveBeenCalled();
  });
});
