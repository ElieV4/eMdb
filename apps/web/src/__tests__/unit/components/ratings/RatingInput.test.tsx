/**
 * Tests unitaires pour RatingInput.
 * Phase 4.2 — Ratings
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { RatingInput } from "@/components/ratings/RatingInput";

describe("RatingInput", () => {
  it("affiche 5 étoiles (10 zones cliquables : moitié gauche/droite par étoile)", () => {
    const { container } = render(<RatingInput value={5} onChange={jest.fn()} />);
    expect(container.querySelectorAll("svg.lucide-star")).toHaveLength(5);
    expect(screen.getAllByRole("button")).toHaveLength(10);
  });

  it("affiche la note actuelle", () => {
    render(<RatingInput value={7} onChange={jest.fn()} />);
    expect(screen.getByText("7/10")).toBeInTheDocument();
  });

  it("appelle onChange avec une valeur entière au clic (moitié droite = valeur paire)", () => {
    const onChange = jest.fn();
    render(<RatingInput value={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Noter 8/10" }));
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it("appelle onChange avec une valeur entière au clic (moitié gauche = valeur impaire)", () => {
    const onChange = jest.fn();
    render(<RatingInput value={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Noter 7/10" }));
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("affiche la note au hover sans changer la valeur", () => {
    const onChange = jest.fn();
    render(<RatingInput value={3} onChange={onChange} />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Noter 8/10" }));
    // La valeur affichée reste 3 (pas de changement de valeur)
    expect(screen.getByText("3/10")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
