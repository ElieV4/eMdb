import { buildEntityUrl, extractIdFromRouteParam, slugify } from "@/lib/utils";

describe("slugify", () => {
  it("lowercases and replaces spaces/punctuation with hyphens", () => {
    expect(slugify("Inception: The Beginning!")).toBe("inception-the-beginning");
  });

  // \w n'inclut pas les caractères accentués : ils sont retirés (pas
  // translittérés) plutôt que convertis en équivalent ASCII — comportement
  // existant de slugify(), pas modifié par buildEntityUrl().
  it("strips accented characters rather than transliterating them", () => {
    expect(slugify("L'Été où j'ai grandi !")).toBe("lt-o-jai-grandi");
  });
});

describe("buildEntityUrl", () => {
  it("appends a slug built from the label", () => {
    expect(buildEntityUrl("/titles", "abc-123", "Inception")).toBe("/titles/abc-123-inception");
  });

  it("falls back to the bare id when the label is empty/null/undefined", () => {
    expect(buildEntityUrl("/titles", "abc-123", null)).toBe("/titles/abc-123");
    expect(buildEntityUrl("/titles", "abc-123", undefined)).toBe("/titles/abc-123");
    expect(buildEntityUrl("/titles", "abc-123", "")).toBe("/titles/abc-123");
  });
});

describe("extractIdFromRouteParam", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  it("extracts the UUID from an id-slug route param", () => {
    expect(extractIdFromRouteParam(`${uuid}-inception-2010`)).toBe(uuid);
  });

  it("returns the UUID unchanged when there is no slug suffix (old links)", () => {
    expect(extractIdFromRouteParam(uuid)).toBe(uuid);
  });

  it("returns the param as-is when it doesn't start with a UUID", () => {
    expect(extractIdFromRouteParam("not-a-uuid")).toBe("not-a-uuid");
  });
});
