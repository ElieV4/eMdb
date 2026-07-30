/**
 * Tests unitaires pour TitleActions.
 * Bug #13 — Vérifie la présence et le comportement des actions titre.
 */

jest.mock("@/hooks/api/useUserFollows", () => ({
  useUserFollows: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
}));

jest.mock("@/hooks/api/useUserLists", () => ({
  useUserLists: () => ({
    data: [
      {
        id: "fav-1",
        nom: "Favoris",
        type: "favoris",
        user_id: "u1",
        created_at: "2026-01-01",
      },
      {
        id: "watch-1",
        nom: "Watchlist",
        type: "watchlist",
        user_id: "u1",
        created_at: "2026-01-01",
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

jest.mock("@/hooks/api/useAddListItem", () => ({
  useAddListItem: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/hooks/api/useRemoveListItem", () => ({
  useRemoveListItem: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/hooks/api/useCreateList", () => ({
  useCreateList: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/components/watches/WatchButton", () => ({
  WatchButton: () => <div data-testid="watch-button" />,
}));

jest.mock("@/components/watches/FollowButton", () => ({
  FollowButton: () => <div data-testid="follow-button" />,
}));

jest.mock("@/components/ratings/RatingInput", () => ({
  RatingInput: () => <div data-testid="rating-input" />,
}));

jest.mock("@/hooks/api/useWatches", () => ({
  useWatches: () => ({
    data: { items: [] },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock("@/store/authStore", () => {
  const mockUseAuthStore = () => ({
    isAuthenticated: true,
    user: { id: "u1", email: "test@example.com", pseudo: "test" },
  });

  Object.defineProperty(mockUseAuthStore, "getState", {
    value: () => ({
      isAuthenticated: true,
      user: { id: "u1", email: "test@example.com", pseudo: "test" },
    }),
  });

  return { useAuthStore: mockUseAuthStore };
});

import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/queryClient";
import { TitleActions } from "@/components/titles/TitleActions";

function renderWithClient(ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("TitleActions", () => {
  it("affiche les actions principales pour un film", () => {
    renderWithClient(<TitleActions titleId="title-1" type="film" />);
    expect(screen.getByTestId("watch-button")).toBeInTheDocument();
    expect(screen.getByTestId("rating-input")).toBeInTheDocument();
  });

  it("affiche les actions principales pour une série", () => {
    renderWithClient(<TitleActions titleId="title-1" type="serie" />);
    expect(screen.getByTestId("watch-button")).toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toBeInTheDocument();
    expect(screen.getByTestId("rating-input")).toBeInTheDocument();
  });
});
