/**
 * Tests unitaires pour useRegister.
 */

import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRegister } from "@/hooks/auth/useRegister";
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

describe("useRegister", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().logout();
    document.cookie = "";
  });

  it("existe", () => {
    expect(useRegister).toBeDefined();
  });

  it("appelle apiFetch avec les bonnes données", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      accessToken: "fake-access-token",
      refreshToken: "fake-refresh-token",
      user: { id: "1", email: "test@test.com", pseudo: "TestUser" },
    });

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        email: "test@test.com",
        pseudo: "TestUser",
        password: "password123",
      });
    });

    expect(apiFetch).toHaveBeenCalledWith("/auth/register", {
      method: "POST",
      body: {
        email: "test@test.com",
        pseudo: "TestUser",
        password: "password123",
      },
    });
  });

  it("met à jour le store après register réussi", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      accessToken: "fake-access-token",
      refreshToken: "fake-refresh-token",
      user: { id: "1", email: "test@test.com", pseudo: "TestUser" },
    });

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        email: "test@test.com",
        pseudo: "TestUser",
        password: "password123",
      });
    });

    const store = useAuthStore.getState();
    expect(store.accessToken).toBe("fake-access-token");
    expect(store.refreshToken).toBe("fake-refresh-token");
    expect(store.user?.pseudo).toBe("TestUser");
    expect(store.isAuthenticated).toBe(true);
  });

  it("set le cookie emdb_access_token", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      accessToken: "fake-access-token",
      refreshToken: "fake-refresh-token",
      user: { id: "1", email: "test@test.com", pseudo: "TestUser" },
    });

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        email: "test@test.com",
        pseudo: "TestUser",
        password: "password123",
      });
    });

    expect(document.cookie).toContain("emdb_access_token=fake-access-token");
  });
});
