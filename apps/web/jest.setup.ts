import "@testing-library/jest-dom";

// Mock global pour next/navigation : useSearchParams() renvoie null/undefined
// dans l'environnement de test (jsdom, hors App Router réel), ce qui casse
// tout composant appelant .get(...) dessus (ex. parseTitleFilters côté
// apps/web/src/lib/titleFilters.ts) avec une erreur "Cannot read properties
// of null". Un fichier de test peut toujours définir son propre
// `jest.mock("next/navigation", ...)` local, qui prend le pas sur celui-ci.
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  useParams: () => ({}),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));
