/**
 * Tests unitaires pour useAuth.
 */

import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/auth/useAuth";
import { useAuthStore } from "@/store/authStore";

describe("useAuth", () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it("existe", () => {
    expect(useAuth).toBeDefined();
  });

  it("retourne l'état du store", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current).toHaveProperty("user");
    expect(result.current).toHaveProperty("accessToken");
    expect(result.current).toHaveProperty("refreshToken");
    expect(result.current).toHaveProperty("isAuthenticated");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("setUser");
    expect(result.current).toHaveProperty("setAccessToken");
    expect(result.current).toHaveProperty("setRefreshToken");
    expect(result.current).toHaveProperty("logout");
  });

  it("retourne isAuthenticated=false par défaut", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.refreshToken).toBeNull();
  });

  it("retourne isAuthenticated=true après setUser", () => {
    const { result } = renderHook(() => useAuth());
    act(() => {
      result.current.setUser({
        id: "1",
        email: "test@test.com",
        pseudo: "TestUser",
      });
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("test@test.com");
  });

  it("clear l'état après logout", () => {
    const { result } = renderHook(() => useAuth());
    act(() => {
      result.current.setUser({
        id: "1",
        email: "test@test.com",
        pseudo: "TestUser",
      });
      result.current.setAccessToken("fake-token");
      result.current.setRefreshToken("fake-refresh");
    });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.refreshToken).toBeNull();
  });
});
