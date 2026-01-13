import { test, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { NotificationProvider, useNotifications } from "./NotificationContext";
import { AuthContext } from "./AuthContext";

test("does not crash without user", () => {
  const wrapper = ({ children }) => (
    <AuthContext.Provider value={{ isAuthenticated: false }}>
      <NotificationProvider>{children}</NotificationProvider>
    </AuthContext.Provider>
  );

  const { result } = renderHook(() => useNotifications(), { wrapper });

  expect(result.current.notifications).toEqual([]);
});
