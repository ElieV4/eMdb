/**
 * Tests unitaires des utilitaires de sous-groupes (arbre à plat → affichage).
 */

import { flattenGroupTree, groupWithDescendants, itemInGroup } from "@/lib/listGroups";
import { ListGroup } from "@/lib/types/api";

const groups: ListGroup[] = [
  { id: "foot", parent_id: "sport", nom: "Foot", position: 1 },
  { id: "sport", parent_id: null, nom: "Sport", position: 0 },
  { id: "tennis", parent_id: "sport", nom: "Tennis", position: 0 },
  { id: "rg", parent_id: "tennis", nom: "Roland-Garros", position: 0 },
  { id: "polar", parent_id: null, nom: "Polar", position: 1 },
];

describe("flattenGroupTree", () => {
  it("ordonne parent puis enfants, avec profondeur et chemin", () => {
    const nodes = flattenGroupTree(groups);

    expect(nodes.map((n) => [n.id, n.depth])).toEqual([
      ["sport", 0],
      ["tennis", 1],
      ["rg", 2],
      ["foot", 1],
      ["polar", 0],
    ]);
    expect(nodes.find((n) => n.id === "rg")?.path).toBe("Sport › Tennis › Roland-Garros");
  });

  it("traite un groupe orphelin comme une racine", () => {
    const nodes = flattenGroupTree([{ id: "x", parent_id: "absent", nom: "X", position: 0 }]);
    expect(nodes).toEqual([expect.objectContaining({ id: "x", depth: 0, path: "X" })]);
  });
});

describe("groupWithDescendants / itemInGroup", () => {
  it("inclut tous les descendants", () => {
    expect([...groupWithDescendants(groups, "sport")].sort()).toEqual(
      ["foot", "rg", "sport", "tennis"].sort(),
    );
  });

  it("un titre rangé dans Roland-Garros apparaît dans Tennis et Sport, pas dans Foot", () => {
    expect(itemInGroup(["rg"], groups, "sport")).toBe(true);
    expect(itemInGroup(["rg"], groups, "tennis")).toBe(true);
    expect(itemInGroup(["rg"], groups, "foot")).toBe(false);
  });

  it("un titre rangé nulle part n'appartient à aucun groupe", () => {
    expect(itemInGroup([], groups, "sport")).toBe(false);
  });
});
