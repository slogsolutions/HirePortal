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

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    css: true,

    // ONLY run your unit tests
    include: [
      "src/**/*.{test,spec}.{js,jsx,ts,tsx}",
    ],

    // NEVER run Playwright or deps
    exclude: [
      "node_modules",
      "dist",
      "build",
      "coverage",
      "playwright.config.*",
      "**/*.e2e.*",
      "**/*.spec.ts",
      "tests/**", // Playwright folder
    ],

    // 💀 This fixes CI hanging
    threads: false,
    isolate: false,
    watch: false,
    pool: "forks",

    deps: {
      inline: [],
    },

    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
