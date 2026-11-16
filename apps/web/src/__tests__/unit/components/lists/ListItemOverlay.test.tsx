/**
 * Tests unitaires pour ListItemOverlay : "vu dans la liste" et "Ranger".
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ListItemOverlay } from "@/components/lists/ListItemOverlay";

const base = {
  titre: "Match Point",
  showVu: true,
  vu: false,
  canEdit: true,
  onToggleVu: jest.fn(),
  showRanger: false,
  onRanger: jest.fn(),
};

describe("ListItemOverlay", () => {
  beforeEach(() => jest.clearAllMocks());

  it("bascule le vu au clic quand l'utilisateur en a le droit", () => {
    render(<ListItemOverlay {...base} />);

    fireEvent.click(screen.getByRole("button", { name: /Marquer comme vu/ }));

    expect(base.onToggleVu).toHaveBeenCalled();
  });

  it("indique qui a marqué le titre comme vu", () => {
    render(<ListItemOverlay {...base} vu vuBy="marie" />);

    const button = screen.getByRole("button", { name: /Marquer comme pas vu/ });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("title", "Vu dans la liste (marqué par marie)");
  });

  it("en lecture seule : indicateur sans bouton, et rien si pas vu", () => {
    const { rerender } = render(<ListItemOverlay {...base} canEdit={false} vu />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Match Point : Vu dans la liste/)).toBeInTheDocument();

    rerender(<ListItemOverlay {...base} canEdit={false} vu={false} />);
    expect(screen.queryByLabelText(/Vu dans la liste/)).not.toBeInTheDocument();
  });

  it("bouton commentaires avec compteur", () => {
    const onComments = jest.fn();
    render(<ListItemOverlay {...base} showVu={false} onComments={onComments} commentCount={3} />);

    fireEvent.click(screen.getByRole("button", { name: "Commentaires : Match Point (3)" }));
    expect(onComments).toHaveBeenCalled();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("ouvre le rangement en sous-groupes", () => {
    render(<ListItemOverlay {...base} showVu={false} showRanger />);

    fireEvent.click(screen.getByRole("button", { name: /Ranger dans des sous-groupes/ }));

    expect(base.onRanger).toHaveBeenCalled();
  });
});
