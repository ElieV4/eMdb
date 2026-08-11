/**
 * Tests unitaires pour TitleHero.
 * Phase 3 - Pages de détail
 */

import { render, screen, waitFor } from "@testing-library/react";
import { TitleHero } from "@/components/titles/TitleHero";
import { TitleDetail } from "@/lib/types/api";

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

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);
    }) as jest.Mock;
  });

  it("affiche le titre VO", () => {
    render(<TitleHero title={mockTitle} />);
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("affiche le titre VF quand différent du VO", () => {
    const title = { ...mockTitle, titre_vf: "Inception VF" };
    render(<TitleHero title={title} />);
    expect(screen.getByText("Inception VF")).toBeInTheDocument();
  });

  it("affiche l'année de sortie", () => {
    render(<TitleHero title={mockTitle} />);
    expect(screen.getByText("(2010)")).toBeInTheDocument();
  });

  it("affiche la note IMDB", () => {
    render(<TitleHero title={mockTitle} />);
    expect(screen.getByText("8.7")).toBeInTheDocument();
  });

  it("affiche le type Film pour un film", () => {
    render(<TitleHero title={mockTitle} />);
    const badges = screen.getAllByText("Film");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("affiche le type Série pour une série", () => {
    render(<TitleHero title={mockSerie} />);
    const badges = screen.getAllByText("Série");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("affiche le statut quand disponible", () => {
    render(<TitleHero title={mockTitle} />);
    expect(screen.getByText("Released")).toBeInTheDocument();
  });

  it("affiche le synopsis quand disponible", () => {
    render(<TitleHero title={mockTitle} />);
    expect(screen.getByText("Un film de science-fiction.")).toBeInTheDocument();
  });

  it("affiche le lien TMDB sous le synopsis", () => {
    render(<TitleHero title={mockTitle} />);

    expect(screen.getByRole("link", { name: /Voir sur TMDB/i })).toHaveAttribute(
      "href",
      "https://www.themoviedb.org/movie/123",
    );
  });

  it("n'affiche que les plateformes de streaming confirmées par TMDB watch/providers, toutes vers la même page TMDB précise", async () => {
    render(<TitleHero title={mockTitle} />);

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

    render(<TitleHero title={mockTitle} />);

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

    render(<TitleHero title={mockTitle} />);

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /HydraFlix/i })).not.toBeInTheDocument();
    });
  });

  it("cache entièrement le bloc 'Gratuit / sites whitelistés' quand tous les sites renvoient 404", async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ valid: false, status: 404 }),
      } as Response),
    );

    render(<TitleHero title={mockTitle} />);

    await waitFor(() => {
      expect(screen.queryByText("Gratuit / sites whitelistés")).not.toBeInTheDocument();
    });
  });

  it("n'affiche pas le titre VF quand identique au VO", () => {
    render(<TitleHero title={mockTitle} />);
    expect(screen.queryByText("Inception")).toBeInTheDocument();
    // titre_vf === titre_vo, donc pas de titre VF supplémentaire
  });
});
