/**
 * Tests unitaires pour ListActionsMenu : les actions affichées dépendent
 * des droits (capabilities) de l'utilisateur sur une liste partagée.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ListActionsMenu } from "@/components/lists/ListActionsMenu";
import { ListCapabilities } from "@/lib/types/api";

const mutation = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/hooks/api/useDeleteList", () => ({ useDeleteList: () => mutation }));
jest.mock("@/hooks/api/useLeaveSharedList", () => ({ useLeaveSharedList: () => mutation }));
jest.mock("@/hooks/api/useCreateList", () => ({ useCreateList: () => mutation }));
jest.mock("@/hooks/api/useUpdateList", () => ({ useUpdateList: () => mutation }));
jest.mock("@/hooks/api/useShareList", () => ({ useShareList: () => mutation }));
jest.mock("@/hooks/api/useRemoveShare", () => ({ useRemoveShare: () => mutation }));
jest.mock("@/hooks/api/useUpdateShareMode", () => ({ useUpdateShareMode: () => mutation }));
jest.mock("@/hooks/api/useShares", () => ({ useShares: () => ({ data: [], isLoading: false }) }));
jest.mock("@/hooks/api/useSearchUsers", () => ({
  useSearchUsers: () => ({ data: [], isFetching: false }),
}));

const list = { id: "l1", nom: "Ciné-club", type: "custom" as const, share_mode: "lecture" as const };

const none: ListCapabilities = {
  canAddItems: false,
  canRemoveItems: false,
  canEditItems: false,
  canEditList: false,
  canDeleteList: false,
  canManageShares: false,
};

function renderButtons(capabilities: ListCapabilities, role: "owner" | "member", type = list.type) {
  render(
    <ListActionsMenu
      list={{ ...list, type }}
      capabilities={capabilities}
      role={role}
      variant="buttons"
    />,
  );
}

const button = (name: string) => screen.queryByRole("button", { name: new RegExp(name, "i") });

const owner: ListCapabilities = {
  canAddItems: true,
  canRemoveItems: true,
  canEditItems: true,
  canEditList: true,
  canDeleteList: true,
  canManageShares: true,
};

/** Ouvre le menu du bouton crayon et renvoie les libellés de ses entrées. */
async function openEditMenu() {
  fireEvent.click(button("Modifier la liste")!);
  const items = await screen.findAllByRole("menuitem");
  return items.map((i) => i.textContent?.trim());
}

describe("ListActionsMenu — en-tête de la page liste", () => {
  it("boutons icône seule, libellé en aria-label (affiché au survol)", () => {
    renderButtons(owner, "owner");

    const pencil = button("Modifier la liste")!;
    expect(pencil).toHaveAttribute("aria-label", "Modifier la liste");
    expect(pencil.textContent).toBe("");
    expect(pencil.className).toContain("rounded-full");
    // Partager et Supprimer ne sont plus dans l'en-tête (dans « Configurer »).
    expect(button("Partager")).not.toBeInTheDocument();
    expect(button("Supprimer la liste")).not.toBeInTheDocument();
    expect(button("Quitter la liste")).not.toBeInTheDocument();
  });

  it("créateur d'une liste perso : le crayon propose Configurer et Modifier le contenu", async () => {
    renderButtons(owner, "owner");
    expect(await openEditMenu()).toEqual(["Configurer la liste", "Modifier le contenu"]);
  });

  it("Configurer la liste : nom, partage et suppression dans un seul dialogue", async () => {
    renderButtons(owner, "owner");
    await openEditMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /Configurer la liste/ }));

    expect(screen.getByLabelText("Nom")).toHaveValue("Ciné-club");
    expect(screen.getByText("Droits des membres")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Supprimer la liste/ }));
    expect(screen.getByText("Supprimer la liste ?")).toBeInTheDocument();
  });

  it("watchlist / favoris : seulement Modifier le contenu", async () => {
    renderButtons(owner, "owner", "watchlist" as never);
    expect(await openEditMenu()).toEqual(["Modifier le contenu"]);
  });

  it("membre en collaboratif : Configurer sans partage ni suppression", async () => {
    renderButtons({ ...none, canEditItems: true, canEditList: true }, "member");
    expect(button("Quitter la liste")).toBeInTheDocument();
    await openEditMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /Configurer la liste/ }));

    expect(screen.getByLabelText("Nom")).toBeInTheDocument();
    expect(screen.queryByText("Droits des membres")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Supprimer la liste/ })).not.toBeInTheDocument();
  });

  it("membre en lecture : pas de Configurer, Quitter la liste", async () => {
    renderButtons({ ...none }, "member");
    expect(await openEditMenu()).toEqual(["Modifier le contenu"]);
    expect(button("Quitter la liste")).toBeInTheDocument();
  });

  it("Modifier le contenu appelle onEditContent", async () => {
    const onEditContent = jest.fn();
    render(
      <ListActionsMenu list={list} capabilities={owner} role="owner" variant="buttons" onEditContent={onEditContent} />,
    );
    await openEditMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /Modifier le contenu/ }));
    expect(onEditContent).toHaveBeenCalled();
  });

  it("Ajout rapide : bouton d'en-tête qui bascule le module", () => {
    const onToggle = jest.fn();
    render(
      <ListActionsMenu
        list={list}
        capabilities={{ ...none, canAddItems: true }}
        role="owner"
        variant="buttons"
        quickAdd={{ open: false, onToggle }}
      />,
    );

    fireEvent.click(button("Ajout rapide")!);
    expect(onToggle).toHaveBeenCalled();
  });
});
