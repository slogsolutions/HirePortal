import { test, expect, vi } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, AuthContext } from "./AuthContext";
global.fetch = vi.fn();

test("login sets user & token", async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      user: { id: 1, email: "test@test.com", role: "admin" },
      token: "abc123",
      expiresIn: 3600,
    }),
  });

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  const { result } = renderHook(() => React.useContext(AuthContext), { wrapper });

  await act(() =>
    result.current.login({ email: "test@test.com", password: "123456" })
  );

  expect(result.current.isAuthenticated).toBe(true);
  expect(result.current.user.email).toBe("test@test.com");
});
