/**
 * Tests unitaires pour TitleActions.
 * Bug #13 — Vérifie la présence et le comportement des actions titre.
 */

jest.mock("@/hooks/api/useFollows", () => ({
  useFollows: () => ({
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
  FollowButton: ({ initialFollowed }: { initialFollowed?: boolean }) => (
    <div data-testid="follow-button" data-followed={String(!!initialFollowed)} />
  ),
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
    expect(screen.queryByTestId("watch-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toBeInTheDocument();
    expect(screen.getByTestId("rating-input")).toBeInTheDocument();
  });

  it("n'affiche pas d'étiquette sur le bouton Listes quand le titre n'est dans aucune liste", () => {
    renderWithClient(<TitleActions titleId="title-1" type="film" />);
    expect(screen.queryByLabelText(/Dans \d+ liste/)).not.toBeInTheDocument();
  });

  it("affiche le nombre de listes contenant le titre en étiquette rouge", () => {
    jest.spyOn(require("@/hooks/api/useUserLists"), "useUserLists").mockReturnValue({
      data: [
        { id: "fav-1", nom: "Favoris", type: "favoris", user_id: "u1", created_at: "2026-01-01", contains_title: true },
        { id: "watch-1", nom: "Watchlist", type: "watchlist", user_id: "u1", created_at: "2026-01-01", contains_title: false },
        { id: "custom-1", nom: "Coups de coeur", type: "custom", user_id: "u1", created_at: "2026-01-01", contains_title: true },
      ],
      isLoading: false,
      isError: false,
    });

    renderWithClient(<TitleActions titleId="title-1" type="film" />);
    expect(screen.getByLabelText("Dans 2 listes")).toHaveTextContent("2");
  });

  it("détecte un titre déjà suivi via le champ `id` renvoyé par GET /follows", () => {
    // GET /follows renvoie des objets titre complets ({id, titre_vo, ...}),
    // pas {user_id, title_id} — un ancien hook (useUserFollows, supprimé)
    // lisait `title_id`, toujours undefined en pratique, donc `isFollowed`
    // restait bloqué à false et un reclic sur "Suivre" redondait en 409.
    jest.spyOn(require("@/hooks/api/useFollows"), "useFollows").mockReturnValue({
      data: [{ id: "title-1", tmdb_id: 1, titre_vo: "X", titre_vf: null, affiche_url: null, type: "serie", next_episode_air_date: null, followed_at: "2026-01-01" }],
      isLoading: false,
      isError: false,
    });

    renderWithClient(<TitleActions titleId="title-1" type="serie" />);
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-followed", "true");
  });
});
