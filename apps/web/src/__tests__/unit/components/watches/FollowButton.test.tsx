/**
 * Tests unitaires pour FollowButton.
 * Phase 4.4 — Follows
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FollowButton } from "@/components/watches/FollowButton";

// Mock des hooks
jest.mock("@/hooks/api/useFollow", () => ({
  useFollow: () => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(() => Promise.resolve()),
    isPending: false,
  }),
}));

jest.mock("@/hooks/api/useUnfollow", () => ({
  useUnfollow: () => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(() => Promise.resolve()),
    isPending: false,
  }),
}));

jest.mock("@/hooks/auth/useAuth", () => ({
  useAuth: () => ({
    user: { id: "1", pseudo: "TestUser" },
  }),
}));

describe("FollowButton", () => {
  it("affiche le bouton 'Suivre' quand non suivi", () => {
    render(<FollowButton titleId="1" initialFollowed={false} />);
    expect(screen.getByText("Suivre")).toBeInTheDocument();
  });

  it("affiche le bouton 'Ne plus suivre' quand suivi", () => {
    render(<FollowButton titleId="1" initialFollowed={true} />);
    expect(screen.getByText("Ne plus suivre")).toBeInTheDocument();
  });

  it("appelle useFollow au clic quand non suivi", async () => {
    const mutateAsync = jest.fn(() => Promise.resolve());
    jest.spyOn(require("@/hooks/api/useFollow"), "useFollow").mockReturnValue({
      mutate: jest.fn(),
      mutateAsync,
      isPending: false,
    });

    render(<FollowButton titleId="1" initialFollowed={false} />);
    fireEvent.click(screen.getByText("Suivre"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith("1");
    });
  });
});
