import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },

  plugins: [react(), tailwindcss()],

  // 🧪 Vitest configuration
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    css: true,

    //  ONLY run your tests
    include: [
      "src/**/*.{test,spec}.{js,jsx,ts,tsx}",
      "tests/**/*.{test}.{js,ts}",  // if you keep non-playwright tests here
    ],

    // ❌ NEVER run dependency tests or Playwright
    exclude: [
      "node_modules",
      "dist",
      "build",
      "coverage",
      "playwright.config.*",
      "tests/login-flow.spec.ts",
      "**/*.e2e.*",
      "**/*.spec.ts", // Playwright naming pattern
    ],

    // prevents vite from crawling node_modules test files
    deps: {
      inline: [],
    },
  },
});
