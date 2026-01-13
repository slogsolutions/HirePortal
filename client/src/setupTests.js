import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/* ================================
   VITE ENV (CRITICAL)
================================ */
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_API_BASE: "http://localhost:5000/api",
  },
});

/* ================================
   Browser APIs needed by GSAP
================================ */

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

window.scrollTo = () => {};

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

/* ================================
   GSAP mock (Vite safe)
================================ */
vi.mock("gsap", () => {
  const mockGsap = {
    registerPlugin: () => {},
    to: () => {},
    from: () => {},
    fromTo: () => {},
    timeline: () => ({
      to: () => {},
      from: () => {},
      fromTo: () => {},
    }),
  };

  return {
    default: mockGsap, // import gsap from "gsap"
    gsap: mockGsap, // import { gsap } from "gsap"
  };
});

vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {
    create: () => {},
    refresh: () => {},
    kill: () => {},
    getAll: () => [],
  },
}));

/* ================================
   Firebase mocks
================================ */

vi.mock("firebase/app", () => ({
  initializeApp: () => ({}),
}));

vi.mock("firebase/analytics", () => ({
  getAnalytics: () => ({}),
}));

vi.mock("firebase/messaging", () => ({
  getMessaging: () => ({
    getToken: () => Promise.resolve("test-token"),
    onMessage: () => {},
  }),
}));
