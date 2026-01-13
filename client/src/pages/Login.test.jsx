import { test, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react";
import Login from "./Login";
import { AuthContext } from "@/context/AuthContext";
import { MemoryRouter } from "react-router-dom";

test("login form submits", async () => {
  const login = vi.fn().mockResolvedValue(true);

  render(
    <AuthContext.Provider value={{ login }}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthContext.Provider>
  );

  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "test@test.com" },
  });

  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "123456" },
  });

  fireEvent.click(screen.getByText("Sign In"));

  expect(login).toHaveBeenCalled();
});
