/**
 * Tests unitaires pour FollowPersonButton.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FollowPersonButton } from "@/components/people/FollowPersonButton";

jest.mock("@/hooks/api/useFollowPerson", () => ({
  useFollowPerson: () => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(() => Promise.resolve()),
    isPending: false,
  }),
}));

jest.mock("@/hooks/api/useUnfollowPerson", () => ({
  useUnfollowPerson: () => ({
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

describe("FollowPersonButton", () => {
  it("affiche le bouton 'Suivre' quand non suivi", () => {
    render(<FollowPersonButton personId="1" initialFollowed={false} />);
    expect(screen.getByText("Suivre")).toBeInTheDocument();
  });

  it("affiche le bouton 'Ne plus suivre' quand suivi", () => {
    render(<FollowPersonButton personId="1" initialFollowed={true} />);
    expect(screen.getByText("Ne plus suivre")).toBeInTheDocument();
  });

  it("appelle useFollowPerson au clic quand non suivi", async () => {
    const mutateAsync = jest.fn(() => Promise.resolve());
    jest.spyOn(require("@/hooks/api/useFollowPerson"), "useFollowPerson").mockReturnValue({
      mutate: jest.fn(),
      mutateAsync,
      isPending: false,
    });

    render(<FollowPersonButton personId="1" initialFollowed={false} />);
    fireEvent.click(screen.getByText("Suivre"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith("1");
    });
  });
});
