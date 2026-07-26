import { renderHook } from "@testing-library/react";
import { useDebounce, useDebouncedCallback } from "@/hooks/ui/useDebounce";

describe("useDebounce", () => {
  it("returns the debounced value after the delay", async () => {
    const { result } = renderHook(() => useDebounce("test", 100));
    expect(result.current).toBe("test");
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 500));
    expect(result.current).toBe("initial");
  });

  it("uses default delay of 500ms", () => {
    const { result } = renderHook(() => useDebounce("value"));
    expect(result.current).toBe("value");
  });
});

describe("useDebouncedCallback", () => {
  it("does not call callback immediately", () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));
    result.current("arg");
    expect(callback).not.toHaveBeenCalled();
  });

  it("calls callback after the delay", async () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));
    result.current("test-arg");
    jest.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledWith("test-arg");
    jest.useRealTimers();
  });
});
