/**
 * Tests unitaires : module « Modifier le contenu » (action d'abord, puis
 * sélection, puis validation en masse) et sa logique.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BulkEditPanel } from "@/components/common/BulkEditPanel";
import { availableActions, groupUpdates } from "@/lib/bulkEdit";
import { ListGroup } from "@/lib/types/api";

const addItem = jest.fn();
const removeItem = jest.fn();
const createWatch = jest.fn();
const deleteWatch = jest.fn();
const setItemGroups = jest.fn();
const getOrImport = jest.fn();

jest.mock("@/hooks/api/useAddItem", () => ({ useAddItem: () => ({ mutateAsync: addItem }) }));
jest.mock("@/hooks/api/useRemoveItem", () => ({ useRemoveItem: () => ({ mutateAsync: removeItem }) }));
jest.mock("@/hooks/api/useCreateWatch", () => ({ useCreateWatch: () => ({ mutateAsync: createWatch }) }));
jest.mock("@/hooks/api/useDeleteWatch", () => ({ useDeleteWatch: () => ({ mutateAsync: deleteWatch }) }));
jest.mock("@/hooks/api/useListGroups", () => ({ useSetItemGroups: () => ({ mutateAsync: setItemGroups }) }));
jest.mock("@/hooks/api/useGetOrImportTitle", () => ({ useGetOrImportTitle: () => ({ mutateAsync: getOrImport }) }));
jest.mock("@/hooks/api/useLists", () => ({
  useLists: () => ({ data: [{ id: "l-active", nom: "Ciné-club" }, { id: "l-other", nom: "À revoir" }] }),
}));
jest.mock("@/hooks/api/useSharedLists", () => ({ useSharedLists: () => ({ data: [] }) }));

const groups = [
  { id: "g-sport", list_id: "l-active", parent_id: null, nom: "Sport", position: 0 },
  { id: "g-tennis", list_id: "l-active", parent_id: "g-sport", nom: "Tennis", position: 0 },
] as ListGroup[];

function Harness(props: Partial<React.ComponentProps<typeof BulkEditPanel>> & { selectedIds?: string[] }) {
  const { selectedIds = ["t1", "t2"], ...rest } = props;
  return (
    <BulkEditPanel
      action={null}
      onActionChange={jest.fn()}
      selected={selectedIds.map((id) => ({ id, titleId: id }))}
      onClearSelection={jest.fn()}
      onClose={jest.fn()}
      activeList={{ id: "l-active", nom: "Ciné-club" }}
      canRemoveFromActive
      canEditItems
      allowReorder
      groups={groups}
      groupIdsByTitle={new Map([["t1", ["g-sport"]], ["t2", []]])}
      {...rest}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  [addItem, removeItem, createWatch, deleteWatch, setItemGroups].forEach((m) => m.mockResolvedValue({}));
});

describe("BulkEditPanel", () => {
  it("propose d'abord de choisir l'action", () => {
    render(<Harness />);
    const options = Array.from((screen.getByLabelText("Action") as HTMLSelectElement).options).map((o) => o.textContent);
    expect(options).toEqual([
      "Choisir une action…",
      "Marquer comme vu",
      "Retirer de cette liste",
      "Ajouter à une autre liste",
      "Retirer d'une autre liste",
      "Ajouter à un groupe",
      "Retirer d'un groupe",
      "Réordonner (glisser-déposer)",
    ]);
  });

  it("marquer comme vu : applique à toute la sélection en une validation", async () => {
    render(<Harness action="markWatched" />);
    expect(screen.getByText("sélectionnés", { exact: false })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Valider/ }));

    await waitFor(() => expect(createWatch).toHaveBeenCalledTimes(2));
    expect(createWatch).toHaveBeenCalledWith({ title_id: "t1" });
    expect(await screen.findByRole("status")).toHaveTextContent("2 titres modifiés");
  });

  it("ajouter à une autre liste : la liste cible est requise, la liste active n'est pas proposée", async () => {
    render(<Harness action="addToList" />);
    const target = screen.getByLabelText("Liste cible") as HTMLSelectElement;
    expect(Array.from(target.options).map((o) => o.textContent)).toEqual(["Choisir une liste…", "À revoir"]);
    expect(screen.getByRole("button", { name: /Valider/ })).toBeDisabled();

    fireEvent.change(target, { target: { value: "l-other" } });
    fireEvent.click(screen.getByRole("button", { name: /Valider/ }));

    await waitFor(() => expect(addItem).toHaveBeenCalledTimes(2));
    expect(addItem).toHaveBeenCalledWith({ listId: "l-other", data: { title_id: "t2" } });
  });

  it("ajouter à un sous-groupe : garde les autres groupes, ignore les titres déjà rangés", async () => {
    render(<Harness action="addToGroup" groupIdsByTitle={new Map([["t1", ["g-sport", "g-tennis"]], ["t2", ["g-sport"]]])} />);
    fireEvent.change(screen.getByLabelText("Groupe cible"), { target: { value: "g-tennis" } });
    fireEvent.click(screen.getByRole("button", { name: /Valider/ }));

    await waitFor(() => expect(setItemGroups).toHaveBeenCalledTimes(1));
    expect(setItemGroups).toHaveBeenCalledWith({ listId: "l-active", titleId: "t2", groupIds: ["g-sport", "g-tennis"] });
  });

  it("titres TMDB pas encore en base : importés avant l'action", async () => {
    getOrImport.mockResolvedValue({ id: "uuid-550" });
    render(
      <BulkEditPanel
        action="addToList"
        onActionChange={jest.fn()}
        selected={[{ id: "550", titleId: "550", local: false, tmdbId: 550, type: "film" }]}
        onClearSelection={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Liste cible"), { target: { value: "l-other" } });
    fireEvent.click(screen.getByRole("button", { name: /Valider/ }));

    await waitFor(() => expect(addItem).toHaveBeenCalledWith({ listId: "l-other", data: { title_id: "uuid-550" } }));
    expect(getOrImport).toHaveBeenCalledWith({ tmdbId: 550, type: "film" });
  });

  it("supprimer de l'historique : demande confirmation", async () => {
    render(
      <BulkEditPanel
        action="deleteHistory"
        onActionChange={jest.fn()}
        selected={[{ id: "w1", titleId: "t1", watchId: "w1" }]}
        onClearSelection={jest.fn()}
        onClose={jest.fn()}
        allowDeleteHistory
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Valider/ }));
    expect(deleteWatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(deleteWatch).toHaveBeenCalledWith("w1"));
  });
});

describe("bulkEdit (logique)", () => {
  it("historique : pas de liste active, suppression proposée", () => {
    expect(availableActions({ allowDeleteHistory: true })).toEqual([
      "markWatched",
      "addToList",
      "removeFromList",
      "deleteHistory",
    ]);
  });

  it("membre en lecture : ni retrait, ni groupes, ni réordonnancement", () => {
    expect(
      availableActions({ activeList: { id: "l", nom: "L" }, hasGroups: true, allowReorder: true }),
    ).toEqual(["markWatched", "addToList", "removeFromList"]);
  });

  it("retirer d'un groupe : seulement les titres qui y sont", () => {
    expect(groupUpdates(["a", "b"], new Map([["a", ["g", "h"]]]), "g", "remove")).toEqual([
      { titleId: "a", groupIds: ["h"] },
    ]);
  });
});
