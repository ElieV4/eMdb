/**
 * Tests unitaires pour ItemCommentsDialog et MyCommentEditor : commentaire
 * perso, avis des membres, fil partagé selon les droits.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ItemCommentsDialog } from "@/components/lists/ItemCommentsDialog";

const saveMutate = jest.fn();
const addMutate = jest.fn();
const deleteMutate = jest.fn();
let thread: { canWrite: boolean; comments: unknown[] } | undefined;

jest.mock("@/hooks/api/useComments", () => ({
  useSaveMyComment: () => ({ mutate: saveMutate, isPending: false }),
  useItemComments: () => ({ data: thread, isLoading: false }),
  useAddItemComment: () => ({ mutate: addMutate, isPending: false }),
  useUpdateItemComment: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteItemComment: () => ({ mutate: deleteMutate, isPending: false }),
}));

const comment = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  contenu: "On le regarde jeudi ?",
  created_at: "2026-11-16T10:00:00Z",
  updated_at: "2026-11-16T10:00:00Z",
  author: { id: "u2", pseudo: "marie", avatar_url: null },
  canEdit: false,
  canDelete: false,
  ...overrides,
});

const item = {
  id: "t1",
  titre: "Match Point",
  myComment: "Excellent",
  memberComments: [{ pseudo: "marie", commentaire: "Mon préféré" }],
};

function renderDialog(isShared = true) {
  render(<ItemCommentsDialog open onOpenChange={jest.fn()} listId="l1" isShared={isShared} item={item} />);
}

describe("ItemCommentsDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    thread = { canWrite: true, comments: [comment()] };
  });

  it("affiche mon commentaire, les avis des membres et le fil", () => {
    renderDialog();

    expect(screen.getByText("Excellent")).toBeInTheDocument();
    expect(screen.getByText("Mon préféré")).toBeInTheDocument();
    expect(screen.getByText("On le regarde jeudi ?")).toBeInTheDocument();
  });

  it("publie un commentaire dans le fil quand on en a le droit", () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText("Nouveau commentaire de la liste"), {
      target: { value: "Oui !" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publier" }));

    expect(addMutate).toHaveBeenCalledWith(
      { listId: "l1", titleId: "t1", contenu: "Oui !" },
      expect.any(Object),
    );
  });

  it("sans droit d'écriture : pas de formulaire, message explicatif", () => {
    thread = { canWrite: false, comments: [comment()] };
    renderDialog();

    expect(screen.queryByLabelText("Nouveau commentaire de la liste")).not.toBeInTheDocument();
    expect(screen.getByText(/ne permet pas de commenter/)).toBeInTheDocument();
  });

  it("propose la suppression seulement quand l'API l'autorise", () => {
    thread = { canWrite: true, comments: [comment({ canDelete: true })] };
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer le commentaire de marie" }));
    expect(deleteMutate).toHaveBeenCalledWith({ listId: "l1", titleId: "t1", commentId: "c1" });
  });

  it("liste non partagée : seulement mon commentaire", () => {
    renderDialog(false);

    expect(screen.getByText("Excellent")).toBeInTheDocument();
    expect(screen.queryByText("Discussion de la liste")).not.toBeInTheDocument();
    expect(screen.queryByText("Mon préféré")).not.toBeInTheDocument();
  });

  it("modifie mon commentaire perso", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /Modifier/ }));
    fireEvent.change(screen.getByLabelText("Mon commentaire"), { target: { value: "Culte" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(saveMutate).toHaveBeenCalledWith({ titleId: "t1", commentaire: "Culte" }, expect.any(Object));
  });
});
