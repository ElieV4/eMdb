/**
 * Tests unitaires pour ListGroupsBar : filtre par sous-groupe et droits.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ListGroupsBar } from "@/components/lists/ListGroupsBar";
import { ListCapabilities, ListGroup } from "@/lib/types/api";

const mutation = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };
jest.mock("@/hooks/api/useListGroups", () => ({
  useCreateGroup: () => mutation,
  useRenameGroup: () => mutation,
  useDeleteGroup: () => mutation,
}));

const groups: ListGroup[] = [
  { id: "sport", parent_id: null, nom: "Sport", position: 0 },
  { id: "tennis", parent_id: "sport", nom: "Tennis", position: 0 },
];

const none: ListCapabilities = {
  canAddItems: false,
  canRemoveItems: false,
  canEditItems: false,
  canEditList: false,
  canDeleteList: false,
  canManageShares: false,
};

function renderBar(capabilities: ListCapabilities, selectedGroupId: string | null = null) {
  const onSelect = jest.fn();
  render(
    <ListGroupsBar
      listId="l1"
      groups={groups}
      capabilities={capabilities}
      counts={new Map([
        ["sport", 3],
        ["tennis", 1],
      ])}
      totalCount={5}
      selectedGroupId={selectedGroupId}
      onSelect={onSelect}
    />,
  );
  return onSelect;
}

describe("ListGroupsBar", () => {
  it("affiche l'arbre avec les compteurs et filtre au clic", () => {
    const onSelect = renderBar(none);

    expect(screen.getByRole("button", { name: /Tous \(5\)/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /› Tennis \(1\)/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Sport \(3\)/ }));
    expect(onSelect).toHaveBeenCalledWith("sport");
  });

  it("en lecture : ni création ni menu de gestion", () => {
    renderBar(none, "sport");

    expect(screen.queryByRole("button", { name: /Sous-groupe$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gérer le sous-groupe/ })).not.toBeInTheDocument();
  });

  it("en mode ouvert : bouton de création et menu sur le groupe sélectionné", () => {
    renderBar({ ...none, canAddItems: true, canRemoveItems: true, canEditItems: true }, "sport");

    expect(screen.getByRole("button", { name: /Sous-groupe$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gérer le sous-groupe Sport" })).toBeInTheDocument();
  });

  it("ne s'affiche pas pour une liste sans sous-groupe qu'on ne peut pas créer", () => {
    const { container } = render(
      <ListGroupsBar
        listId="l1"
        groups={[]}
        capabilities={none}
        counts={new Map()}
        totalCount={2}
        selectedGroupId={null}
        onSelect={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
