/**
 * Tests unitaires pour ListReorder (mode "Modifier le contenu") : rangement
 * des titres dans les groupes et sous-groupes.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ListReorder } from "@/components/lists/ListReorder";
import { ListGroup, TitleSearchResult } from "@/lib/types/api";

const setItemGroups = jest.fn();

jest.mock("@/hooks/api/useListGroups", () => ({
  useSetItemGroups: () => ({ mutate: setItemGroups, isPending: false }),
}));
jest.mock("@/hooks/api/useReorderItems", () => ({ useReorderItems: () => ({ mutate: jest.fn() }) }));
jest.mock("@/hooks/api/useRemoveListItem", () => ({ useRemoveListItem: () => ({ mutate: jest.fn() }) }));
jest.mock("@/hooks/api", () => ({
  useWatchedTitles: () => ({ data: new Set() }),
  useListMembership: () => ({ watchlistIds: new Set(), favoriteIds: new Set() }),
}));
jest.mock("@/components/titles/TitleCard", () => ({
  TitleCard: ({ title }: { title: { titre: string } }) => <div>{title.titre}</div>,
}));

const items: TitleSearchResult[] = [
  { id: "t1", titre: "Match Point", type: "film", local: true },
  { id: "t2", titre: "Rush", type: "film", local: true },
];
const groups: ListGroup[] = [
  { id: "g-sport", list_id: "l1", parent_id: null, nom: "Sport", position: 0 },
  { id: "g-tennis", list_id: "l1", parent_id: "g-sport", nom: "Tennis", position: 0 },
] as ListGroup[];

function renderEdit(groupIds: Record<string, string[]> = {}, canEditGroups = true) {
  render(
    <ListReorder
      listId="l1"
      items={items}
      groups={groups}
      groupIdsByTitle={new Map(items.map((i) => [i.id, groupIds[i.id] ?? []]))}
      canEditGroups={canEditGroups}
    />,
  );
}

const chooseTarget = (groupId: string) =>
  fireEvent.change(screen.getByLabelText("Ranger dans"), { target: { value: groupId } });

describe("ListReorder — groupes en mode édition", () => {
  beforeEach(() => jest.clearAllMocks());

  it("propose les groupes et sous-groupes comme cible", () => {
    renderEdit();
    const options = Array.from(
      (screen.getByLabelText("Ranger dans") as HTMLSelectElement).options,
    ).map((o) => o.textContent);
    expect(options).toEqual(["Choisir un groupe…", "Sport (0)", "  › Tennis (0)"]);
  });

  it("ajoute un titre au sous-groupe cible en gardant ses autres groupes", () => {
    renderEdit({ t1: ["g-sport"] });
    chooseTarget("g-tennis");

    fireEvent.click(screen.getByRole("button", { name: "Ajouter Match Point à Tennis" }));

    expect(setItemGroups).toHaveBeenCalledWith(
      { listId: "l1", titleId: "t1", groupIds: ["g-sport", "g-tennis"] },
      expect.any(Object),
    );
  });

  it("retire un titre du groupe cible", () => {
    renderEdit({ t2: ["g-sport", "g-tennis"] });
    chooseTarget("g-tennis");

    fireEvent.click(screen.getByRole("button", { name: "Retirer Rush de Tennis" }));

    expect(setItemGroups).toHaveBeenCalledWith(
      { listId: "l1", titleId: "t2", groupIds: ["g-sport"] },
      expect.any(Object),
    );
  });

  it("ouvre le choix complet des groupes d'un titre", () => {
    renderEdit({ t1: ["g-tennis"] });

    fireEvent.click(screen.getByRole("button", { name: "Groupes de Match Point" }));

    expect(screen.getByText("Ranger « Match Point »")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Tennis" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Sport" })).not.toBeChecked();
  });

  it("n'affiche rien pour ranger sans le droit de modifier le contenu", () => {
    renderEdit({}, false);
    expect(screen.queryByLabelText("Ranger dans")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Groupes de/ })).not.toBeInTheDocument();
  });
});
