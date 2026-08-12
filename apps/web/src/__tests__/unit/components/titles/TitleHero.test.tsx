/**
 * Tests unitaires pour TitleHero.
 * Phase 3 - Pages de détail
 */

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/queryClient";
import { TitleHero } from "@/components/titles/TitleHero";
import { TitleDetail } from "@/lib/types/api";
import { useAuthStore } from "@/store/authStore";

// TitleHero rend désormais TitleActions en bas du module (actions
// regroupées), qui utilise useQuery/useMutation — nécessite un
// QueryClientProvider (même convention que Filmography.test.tsx).
function renderHero(ui: React.ReactNode) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

jest.mock("@/hooks/api/useSerieProgress", () => ({
  useSerieProgress: () => ({
    data: [{ saison: 1, vus: 5, total: 10 }],
    isLoading: false,
    error: null,
  }),
}));

const mockTitle: TitleDetail = {
  id: "1",
  tmdb_id: 123,
  titre_vo: "Inception",
  titre_vf: "Inception",
  type: "film",
  date_sortie: "2010-07-16",
  duree_minutes: 148,
  note_imdb: 8.7,
  synopsis: "Un film de science-fiction.",
  affiche_url: "/poster.jpg",
  backdrop_url: "/backdrop.jpg",
  statut: "Released",
  is_animation: false,
  next_episode_air_date: null,
  title_genres: [
    { id: "1", genre_id: "g1", genres: { id: "g1", nom: "Sci-Fi" } },
  ],
  title_countries: [
    { id: "1", country_id: "c1", countries: { id: "c1", nom: "USA" } },
  ],
  title_studios: [
    { id: "1", studio_id: "s1", studios: { id: "s1", nom: "Warner Bros" } },
  ],
  seasons: [],
};

const mockSerie: TitleDetail = {
  ...mockTitle,
  id: "2",
  type: "serie",
  titre_vo: "Stranger Things",
  next_episode_air_date: "2023-10-27",
  seasons: [],
};

describe("TitleHero", () => {
  beforeEach(() => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/watch-links/validate?")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ valid: true, status: 200 }),
        } as Response);
      }

      if (url.includes("/watch-links/providers?")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            watchUrl: "https://www.themoviedb.org/movie/123-inception/watch?locale=FR",
            providers: [
              { key: "netflix", name: "Netflix", accessTypes: ["abonnement"] },
              { key: "prime", name: "Prime Video", accessTypes: ["location", "achat"] },
            ],
          }),
        } as Response);
      }

      if (url.includes("/watch-links/archive-org?")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ found: false }),
        } as Response);
      }

      // TitleActions (regroupée en bas du hero) requête /follows et /lists,
      // qui attendent des tableaux — le fallback générique {} ci-dessous
      // casserait `.some()`/`.find()`.
      if (url.includes("/follows") || url.includes("/lists")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);
    }) as jest.Mock;
  });

  it("affiche le titre VO", () => {
    renderHero(<TitleHero title={mockTitle} />);
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("affiche le titre VF quand différent du VO", () => {
    const title = { ...mockTitle, titre_vf: "Inception VF" };
    renderHero(<TitleHero title={title} />);
    expect(screen.getByText("Inception VF")).toBeInTheDocument();
  });

  it("affiche l'année de sortie", () => {
    renderHero(<TitleHero title={mockTitle} />);
    expect(screen.getByText("(2010)")).toBeInTheDocument();
  });

  it("affiche la note IMDB", () => {
    renderHero(<TitleHero title={mockTitle} />);
    expect(screen.getByText("8.7")).toBeInTheDocument();
  });

  it("affiche le type Film pour un film", () => {
    renderHero(<TitleHero title={mockTitle} />);
    const badges = screen.getAllByText("Film");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("affiche le type Série pour une série", () => {
    renderHero(<TitleHero title={mockSerie} />);
    const badges = screen.getAllByText("Série");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("affiche le statut quand disponible", () => {
    renderHero(<TitleHero title={mockTitle} />);
    expect(screen.getByText("Released")).toBeInTheDocument();
  });

  it("affiche le synopsis quand disponible", () => {
    renderHero(<TitleHero title={mockTitle} />);
    expect(screen.getByText("Un film de science-fiction.")).toBeInTheDocument();
  });

  it("affiche le lien TMDB sous le synopsis", () => {
    renderHero(<TitleHero title={mockTitle} />);

    expect(screen.getByRole("link", { name: /Voir sur TMDB/i })).toHaveAttribute(
      "href",
      "https://www.themoviedb.org/movie/123",
    );
  });

  it("n'affiche que les plateformes de streaming confirmées par TMDB watch/providers, toutes vers la même page TMDB précise", async () => {
    renderHero(<TitleHero title={mockTitle} />);

    await waitFor(() => {
      expect(screen.getByText("Streaming FR")).toBeInTheDocument();
    });

    const tmdbWatchUrl = "https://www.themoviedb.org/movie/123-inception/watch?locale=FR";
    expect(screen.getByRole("link", { name: /Netflix/i })).toHaveAttribute("href", tmdbWatchUrl);
    expect(screen.getByRole("link", { name: /Prime Video/i })).toHaveAttribute(
      "href",
      tmdbWatchUrl,
    );
    expect(screen.getByText("Abonnement")).toBeInTheDocument();
    expect(screen.getByText("Location / Achat")).toBeInTheDocument();
    // Ni Canal+, Disney+, ni Apple TV ne sont dans la réponse mockée —
    // aucune plateforme sans le titre ne doit apparaître (module "sans faux
    // lien").
    expect(screen.queryByRole("link", { name: /Canal\+/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Disney\+/i })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Gratuit / sites whitelistés")).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /WatchTV/i })).toHaveAttribute(
      "href",
      "https://www.watchtv.click/movie/inception/",
    );
    expect(screen.getByRole("link", { name: /HydraFlix/i })).toHaveAttribute(
      "href",
      "https://www.hydraflix.cc/inception/",
    );
  });

  it("ne montre aucune plateforme de streaming si TMDB watch/providers ne renvoie rien pour la région", async () => {
    (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/watch-links/providers?")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ watchUrl: null, providers: [] }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ valid: true, status: 200 }),
      } as Response);
    });

    renderHero(<TitleHero title={mockTitle} />);

    await waitFor(() => {
      expect(screen.getByText("Gratuit / sites whitelistés")).toBeInTheDocument();
    });
    expect(screen.queryByText("Streaming FR")).not.toBeInTheDocument();
  });

  it("n'affiche pas les liens libres quand le site renvoie 404", async () => {
    (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("hydraflix.cc")) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({ valid: false, status: 404 }),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ valid: true, status: 200 }),
      } as Response);
    });

    renderHero(<TitleHero title={mockTitle} />);

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /HydraFlix/i })).not.toBeInTheDocument();
    });
  });

  it("garde le bloc 'Gratuit / sites whitelistés' visible avec un message quand tous les sites renvoient 404 (retour utilisateur : jamais masqué)", async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ valid: false, status: 404 }),
      } as Response),
    );

    renderHero(<TitleHero title={mockTitle} />);

    expect(screen.getByText("Gratuit / sites whitelistés")).toBeInTheDocument();
    expect(screen.getByText("Recherche en cours…")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Aucun lien trouvé.")).toBeInTheDocument();
    });
    expect(screen.getByText("Gratuit / sites whitelistés")).toBeInTheDocument();
  });

  it("n'affiche pas le titre VF quand identique au VO", () => {
    renderHero(<TitleHero title={mockTitle} />);
    expect(screen.queryByText("Inception")).toBeInTheDocument();
    // titre_vf === titre_vo, donc pas de titre VF supplémentaire
  });

  it("n'affiche pas la barre de progression pour un film", () => {
    renderHero(<TitleHero title={mockTitle} />);
    expect(screen.queryByText("Progression globale")).not.toBeInTheDocument();
  });

  it("affiche le réalisateur en sous-titre à côté du titre, avec un lien vers sa page", () => {
    renderHero(
      <TitleHero
        title={mockTitle}
        credits={{
          Réalisateur: [
            { id: "credit-1", personnage: null, ordre: null, personne: { id: "person-1", nom: "Christopher Nolan" } },
          ],
        }}
      />,
    );
    expect(screen.getByText("Réalisé par")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Christopher Nolan" })).toHaveAttribute(
      "href",
      "/people/person-1",
    );
  });

  it("n'affiche pas la barre de progression pour une série si non connecté", () => {
    renderHero(<TitleHero title={mockSerie} />);
    expect(screen.queryByText("Progression globale")).not.toBeInTheDocument();
  });

  it("affiche la barre de progression en bas du hero pour une série connectée", () => {
    useAuthStore.setState({ isAuthenticated: true });
    renderHero(<TitleHero title={mockSerie} />);
    expect(screen.getByText("Progression globale")).toBeInTheDocument();
    expect(screen.getByText("5/10")).toBeInTheDocument();
    useAuthStore.setState({ isAuthenticated: false });
  });
});
