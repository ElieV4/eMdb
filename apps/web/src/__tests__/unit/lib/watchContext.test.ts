import {
  WATCH_EMOTION_OPTIONS,
  emotionEmojis,
  emotionLabels,
  emotionOption,
} from "@/lib/watchContext";

describe("tags d'émotion", () => {
  it("propose les 12 tags, chacun avec emoji, couleur et usage", () => {
    expect(WATCH_EMOTION_OPTIONS.map((o) => o.value)).toEqual([
      "joie", "rire", "emerveillement", "tendresse", "nostalgie", "tristesse",
      "choc", "fascination", "tension", "peur", "revolte", "malaise",
    ]);
    for (const o of WATCH_EMOTION_OPTIONS) {
      expect(o.emoji).toBeTruthy();
      expect(o.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(o.hint).toBeTruthy();
    }
  });

  it("emotionEmojis : emojis dans l'ordre, valeurs inconnues ignorées", () => {
    expect(emotionEmojis(["tendresse", "inconnue", "choc"])).toBe("🥹🤯");
    expect(emotionEmojis(null)).toBe("");
  });

  it("emotionLabels : emoji + libellé", () => {
    expect(emotionLabels(["joie", "peur"])).toBe("😄 Joie, 😱 Peur");
    expect(emotionLabels([])).toBeNull();
    expect(emotionOption("nostalgie")?.label).toBe("Nostalgie");
  });
});
