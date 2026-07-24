/**
 * Tests unitaires pour useLogout.
 */

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLogout } from "@/hooks/auth/useLogout";
import { useAuthStore } from "@/store/authStore";
import { apiFetch } from "@/lib/api/apiClient";

jest.mock("@/lib/api/apiClient", () => ({
  apiFetch: jest.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useLogout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up authenticated state
    useAuthStore.getState().setUser({
      id: "1",
      email: "test@test.com",
      pseudo: "TestUser",
    });
    useAuthStore.getState().setAccessToken("fake-access-token");
    useAuthStore.getState().setRefreshToken("fake-refresh-token");
    document.cookie = "emdb_access_token=fake-access-token; path=/";
  });

  it("existe", () => {
    expect(useLogout).toBeDefined();
  });

  it("appelle apiFetch avec /auth/logout", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    expect(apiFetch).toHaveBeenCalledWith("/auth/logout", {
      method: "POST",
    });
  });

  it("clear le store après logout réussi", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    const store = useAuthStore.getState();
    expect(store.user).toBeNull();
    expect(store.accessToken).toBeNull();
    expect(store.refreshToken).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });

  it("clear le cookie après logout réussi", async () => {
    (apiFetch as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    expect(document.cookie).not.toContain(
      "emdb_access_token=fake-access-token",
    );
  });

  it("clear le store même si l'API échoue", async () => {
    (apiFetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    const store = useAuthStore.getState();
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });
});
