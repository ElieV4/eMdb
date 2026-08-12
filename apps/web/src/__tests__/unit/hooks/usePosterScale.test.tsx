/**
 * Tests unitaires pour usePosterScale.
 */

import { renderHook, act } from "@testing-library/react";
import { usePosterScale } from "@/hooks/usePosterScale";
import { useSettingsStore } from "@/store/settingsStore";

describe("usePosterScale", () => {
  afterEach(() => {
    act(() => {
      useSettingsStore.getState().setPosterSize("moyen");
    });
  });

  it("retourne 1 pour la préférence moyenne (défaut)", () => {
    const { result } = renderHook(() => usePosterScale());
    expect(result.current).toBe(1);
  });

  it("retourne un facteur réduit pour 'petit'", () => {
    act(() => {
      useSettingsStore.getState().setPosterSize("petit");
    });
    const { result } = renderHook(() => usePosterScale());
    expect(result.current).toBeLessThan(1);
  });

  it("retourne un facteur augmenté pour 'grand'", () => {
    act(() => {
      useSettingsStore.getState().setPosterSize("grand");
    });
    const { result } = renderHook(() => usePosterScale());
    expect(result.current).toBeGreaterThan(1);
  });
});
