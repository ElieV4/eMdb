/**
 * Tests unitaires pour la page /settings.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/(frontend)/settings/page";
import { useSettingsStore } from "@/store/settingsStore";

describe("SettingsPage", () => {
  afterEach(() => {
    useSettingsStore.setState({ fontSize: "moyen", posterSize: "moyen" });
  });

  it("affiche les deux réglages avec leur valeur actuelle sélectionnée", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Taille de la police")).toBeInTheDocument();
    expect(screen.getByText("Taille des affiches")).toBeInTheDocument();
  });

  it("met à jour le store quand on change la taille de police", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const fontButtons = screen.getAllByRole("button", { name: "Grand" });
    await user.click(fontButtons[0]);

    expect(useSettingsStore.getState().fontSize).toBe("grand");
  });

  it("met à jour le store quand on change la taille des affiches", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const posterButtons = screen.getAllByRole("button", { name: "Petit" });
    await user.click(posterButtons[1]);

    expect(useSettingsStore.getState().posterSize).toBe("petit");
  });
});
