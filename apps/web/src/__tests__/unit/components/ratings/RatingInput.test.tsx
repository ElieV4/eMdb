/**
 * Tests unitaires pour RatingInput.
 * Phase 4.2 — Ratings
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { RatingInput } from "@/components/ratings/RatingInput";

describe("RatingInput", () => {
  it("affiche 10 étoiles", () => {
    render(<RatingInput value={5} onChange={jest.fn()} />);
    const stars = screen.getAllByRole("button");
    expect(stars).toHaveLength(10);
  });

  it("affiche la note actuelle", () => {
    render(<RatingInput value={7.5} onChange={jest.fn()} />);
    expect(screen.getByText("7.5/10")).toBeInTheDocument();
  });

  it("appelle onChange au clic", () => {
    const onChange = jest.fn();
    render(<RatingInput value={0} onChange={onChange} />);
    const stars = screen.getAllByRole("button");
    fireEvent.click(stars[4]); // 5ème étoile = 4.5
    expect(onChange).toHaveBeenCalledWith(4.5);
  });

  it("affiche la note au hover sans changer la valeur", () => {
    const onChange = jest.fn();
    render(<RatingInput value={3} onChange={onChange} />);
    const stars = screen.getAllByRole("button");
    fireEvent.mouseEnter(stars[7]); // hover sur 8
    // La valeur affichée reste 3 (pas de changement de valeur)
    expect(screen.getByText("3/10")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
