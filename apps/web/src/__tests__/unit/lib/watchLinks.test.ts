/**
 * Tests unitaires pour buildFreeWatchLinks (génération de slug).
 *
 * L'apostrophe est le cas couvert ici : les sites ciblés (WordPress) élident
 * les contractions ("Pan's Labyrinth" -> "pans-labyrinth"), ils ne les
 * remplacent pas par un tiret ("pan-s-labyrinth") — bug confirmé en direct
 * (404 vs 200 sur watchtv.click et hydraflix.cc) avant ce correctif.
 */

import { buildFreeWatchLinks } from "@/lib/watchLinks";

describe("buildFreeWatchLinks", () => {
  it("retire l'apostrophe sans la remplacer par un tiret", () => {
    const links = buildFreeWatchLinks({ title: "Pan's Labyrinth", type: "film" });
    const watchtv = links.find((l) => l.name === "WatchTV");
    const hydraflix = links.find((l) => l.name === "HydraFlix");

    expect(watchtv?.href).toBe("https://www.watchtv.click/movie/pans-labyrinth/");
    expect(hydraflix?.href).toBe("https://www.hydraflix.cc/pans-labyrinth/");
  });

  it("gère l'apostrophe typographique (’) de la même façon", () => {
    const links = buildFreeWatchLinks({ title: "Grey’s Anatomy", type: "serie" });
    const watchtv = links.find((l) => l.name === "WatchTV");

    expect(watchtv?.href).toBe("https://www.watchtv.click/series/greys-anatomy/");
  });

  it("conserve le comportement existant pour les titres sans ponctuation particulière", () => {
    const links = buildFreeWatchLinks({ title: "Psycho", type: "film" });
    const watchtv = links.find((l) => l.name === "WatchTV");
    const hydraflix = links.find((l) => l.name === "HydraFlix");

    expect(watchtv?.href).toBe("https://www.watchtv.click/movie/psycho/");
    expect(hydraflix?.href).toBe("https://www.hydraflix.cc/psycho/");
  });

  it("remplace toujours les deux-points et espaces par un tiret", () => {
    const links = buildFreeWatchLinks({ title: "Spider-Man: Far From Home", type: "film" });
    const watchtv = links.find((l) => l.name === "WatchTV");

    expect(watchtv?.href).toBe("https://www.watchtv.click/movie/spider-man-far-from-home/");
  });
});
