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

describe("ListActionsMenu — listes partagées", () => {
  it("créateur : toutes les actions, dont Partager, mais pas Quitter", () => {
    renderButtons(
      {
        canAddItems: true,
        canRemoveItems: true,
        canEditItems: true,
        canEditList: true,
        canDeleteList: true,
        canManageShares: true,
      },
      "owner",
    );

    expect(button("Partager")).toBeInTheDocument();
    expect(button("Modifier la liste")).toBeInTheDocument();
    expect(button("Modifier le contenu")).toBeInTheDocument();
    // Supprimer : plus dans l'en-tête, mais dans le dialogue « Modifier la liste ».
    expect(button("Supprimer la liste")).not.toBeInTheDocument();
    expect(button("Quitter la liste")).not.toBeInTheDocument();
  });

  it("en-tête : boutons icône seule, libellé en aria-label (affiché au survol)", () => {
    renderButtons({ ...none, canEditList: true, canManageShares: true }, "owner");

    const share = button("Partager")!;
    expect(share).toHaveAttribute("aria-label", "Partager");
    expect(share.textContent).toBe("");
    expect(share.className).toContain("rounded-full");
  });

  it("Supprimer la liste est proposé dans le dialogue Modifier la liste", () => {
    renderButtons({ ...none, canEditList: true, canDeleteList: true }, "owner");

    fireEvent.click(button("Modifier la liste")!);
    fireEvent.click(screen.getByRole("button", { name: /Supprimer la liste/ }));

    expect(screen.getByText("Supprimer la liste ?")).toBeInTheDocument();
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

  it("membre en lecture : seulement Quitter la liste", () => {
    renderButtons({ ...none }, "member");

    expect(button("Quitter la liste")).toBeInTheDocument();
    expect(button("Partager")).not.toBeInTheDocument();
    expect(button("Modifier la liste")).not.toBeInTheDocument();
    expect(button("Modifier le contenu")).not.toBeInTheDocument();
    expect(button("Supprimer la liste")).not.toBeInTheDocument();
  });

  it("membre en collaboratif : renommer et modifier le contenu, pas supprimer ni partager", () => {
    renderButtons({ ...none, canEditItems: true, canEditList: true }, "member");

    expect(button("Modifier la liste")).toBeInTheDocument();
    expect(button("Modifier le contenu")).toBeInTheDocument();
    expect(button("Supprimer la liste")).not.toBeInTheDocument();
    expect(button("Partager")).not.toBeInTheDocument();
  });

  it("ne propose pas de partager une watchlist, même à son créateur", () => {
    renderButtons(
      {
        canAddItems: true,
        canRemoveItems: true,
        canEditItems: true,
        canEditList: true,
        canDeleteList: true,
        canManageShares: true,
      },
      "owner",
      "watchlist" as never,
    );

    expect(button("Partager")).not.toBeInTheDocument();
    expect(button("Modifier le contenu")).toBeInTheDocument();
  });
});
