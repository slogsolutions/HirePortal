import { test, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react";
import App from "./App";
import { AllProviders } from "./test-utils";

test("renders app", () => {
  render(
    <AllProviders>
      <App />
    </AllProviders>
  );

  // navbar brand
  expect(screen.getByText("Slog Solutions")).toBeInTheDocument();
});
