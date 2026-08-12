/**
 * Tests unitaires pour la page /settings.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/queryClient";
import SettingsPage from "@/app/(frontend)/settings/page";
import { useSettingsStore } from "@/store/settingsStore";

// SettingsPage rend TraktImportButton/ImportCreditsButton/useDeleteAccount,
// tous basés sur react-query — nécessite un QueryClientProvider (même
// convention que TitleCard.test.tsx).
function renderSettings() {
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}

describe("SettingsPage", () => {
  afterEach(() => {
    useSettingsStore.setState({ fontSize: "moyen", posterSize: "moyen" });
  });

  it("affiche les deux réglages avec leur valeur actuelle sélectionnée", () => {
    renderSettings();
    expect(screen.getByText("Taille de la police")).toBeInTheDocument();
    expect(screen.getByText("Taille des affiches")).toBeInTheDocument();
  });

  it("met à jour le store quand on change la taille de police", async () => {
    const user = userEvent.setup();
    renderSettings();

    const fontButtons = screen.getAllByRole("button", { name: "Grand" });
    await user.click(fontButtons[0]);

    expect(useSettingsStore.getState().fontSize).toBe("grand");
  });

  it("met à jour le store quand on change la taille des affiches", async () => {
    const user = userEvent.setup();
    renderSettings();

    const posterButtons = screen.getAllByRole("button", { name: "Petit" });
    await user.click(posterButtons[1]);

    expect(useSettingsStore.getState().posterSize).toBe("petit");
  });

  it("affiche la zone de danger avec le bouton de suppression de compte", () => {
    renderSettings();
    expect(screen.getByText("Zone de danger")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Supprimer mon compte/i }),
    ).toBeInTheDocument();
  });

  it("ouvre une confirmation avant de supprimer le compte", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: /Supprimer mon compte/i }));

    expect(
      screen.getByText("Supprimer définitivement le compte ?"),
    ).toBeInTheDocument();
  });
});
