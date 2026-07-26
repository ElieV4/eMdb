/**
 * Tests unitaires pour RatingBadge.
 * Phase 4.2 — Ratings
 */

import { render, screen } from "@testing-library/react";
import { RatingBadge } from "@/components/ratings/RatingBadge";

describe("RatingBadge", () => {
  it("n'affiche rien si note est null", () => {
    const { container } = render(<RatingBadge note={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("n'affiche rien si note est undefined", () => {
    const { container } = render(<RatingBadge note={undefined} />);
    expect(container.innerHTML).toBe("");
  });

  it("affiche la note entière", () => {
    render(<RatingBadge note={8} />);
    expect(screen.getByText("8/10")).toBeInTheDocument();
  });

  it("affiche la note avec décimale", () => {
    render(<RatingBadge note={7.5} />);
    expect(screen.getByText("7.5/10")).toBeInTheDocument();
  });
});