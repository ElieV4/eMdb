/**
 * Tests unitaires pour la vue tableau générique des pages de titres et la
 * bascule affiches / tableau.
 */

import { render, screen, fireEvent, within } from "@testing-library/react";
import { TitlesTable } from "@/components/titles/TitlesTable";
import { ViewModeToggle } from "@/components/titles/ViewModeToggle";
import { sortTitles, nextSort, releaseYear } from "@/lib/titlesTable";
import { TitleSearchResult } from "@/lib/types/api";

jest.mock("@/components/titles/TitleQuickActionsMenu", () => ({
  TitleQuickActionsMenu: () => <button type="button">Actions rapides</button>,
}));
jest.mock("@/components/titles/TitlePoster", () => ({
  TitlePoster: () => <span data-testid="poster" />,
}));

const titles: TitleSearchResult[] = [
  { id: "a", titre: "Match Point", type: "film", dateSortie: "2005-10-26", duree: 124, note: 7.6, local: true },
  { id: "b", titre: "Annie Hall", type: "film", dateSortie: "1977-04-20", duree: 93, note: 8, local: true },
  { id: "c", titre: "The Office", type: "serie", dateSortie: "2005-03-24", nombreEpisodes: 201, local: true },
];

const bodyTitles = () =>
  within(screen.getAllByRole("rowgroup")[1])
    .getAllByRole("link")
    .map((a) => a.textContent);

describe("TitlesTable", () => {
  it("affiche une ligne par titre avec type, année, durée ou épisodes et note", () => {
    render(<TitlesTable titles={titles} />);

    expect(bodyTitles()).toEqual(["Match Point", "Annie Hall", "The Office"]);
    expect(screen.getByText("201 ép.")).toBeInTheDocument();
    expect(screen.getByText("1977")).toBeInTheDocument();
    expect(screen.getByText("8.0")).toBeInTheDocument();
  });

  it("trie au clic sur l'en-tête, valeurs absentes en fin", () => {
    render(<TitlesTable titles={titles} />);

    // Égalité (2005) : l'ordre de la page est conservé.
    fireEvent.click(screen.getByRole("button", { name: "Trier par Année" }));
    expect(bodyTitles()).toEqual(["Annie Hall", "Match Point", "The Office"]);

    fireEvent.click(screen.getByRole("button", { name: "Trier par Note IMDb" }));
    expect(bodyTitles()).toEqual(["Match Point", "Annie Hall", "The Office"]);
    fireEvent.click(screen.getByRole("button", { name: "Trier par Note IMDb" }));
    expect(bodyTitles()).toEqual(["Annie Hall", "Match Point", "The Office"]);
  });

  it("ajoute les colonnes propres à la page et masque celles demandées", () => {
    render(
      <TitlesTable
        titles={titles}
        hideColumns={["note"]}
        extraColumns={[{ id: "prochain", label: "Prochain épisode", render: (t) => `next-${t.id}` }]}
      />,
    );

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toContain("Prochain épisode");
    expect(headers).not.toContain("Note IMDb");
    expect(screen.getByText("next-c")).toBeInTheDocument();
  });

  it("montre les icônes vu / watchlist / favori", () => {
    render(<TitlesTable titles={titles} flagsOf={(t) => ({ watched: t.id === "a", inFavorites: t.id === "b" })} />);

    expect(screen.getByLabelText("Déjà vu")).toBeInTheDocument();
    expect(screen.getByLabelText("Favori")).toBeInTheDocument();
    expect(screen.queryByLabelText("Dans la watchlist")).not.toBeInTheDocument();
  });
});

describe("ViewModeToggle", () => {
  it("bascule entre affiches et tableau", () => {
    const onChange = jest.fn();
    render(<ViewModeToggle mode="affiches" onChange={onChange} />);

    expect(screen.getByRole("button", { name: /Affiches/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /Tableau/ }));
    expect(onChange).toHaveBeenCalledWith("tableau");
  });
});

describe("titlesTable (logique)", () => {
  it("cycle de tri : croissant, décroissant, aucun", () => {
    expect(nextSort(null, "titre")).toEqual({ column: "titre", direction: "asc" });
    expect(nextSort({ column: "titre", direction: "asc" }, "titre")).toEqual({ column: "titre", direction: "desc" });
    expect(nextSort({ column: "titre", direction: "desc" }, "titre")).toBeNull();
  });

  it("sans tri, garde l'ordre de la page", () => {
    expect(sortTitles(titles, null, () => null)).toBe(titles);
  });

  it("année de sortie absente ou invalide", () => {
    expect(releaseYear({ ...titles[0], dateSortie: undefined })).toBeNull();
    expect(releaseYear({ ...titles[0], dateSortie: "n'importe quoi" })).toBeNull();
  });
});
