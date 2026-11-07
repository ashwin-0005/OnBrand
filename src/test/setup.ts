import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

const isBrowser = typeof window !== "undefined";

afterEach(() => {
  if (!isBrowser) return;
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// jsdom lacks matchMedia and IntersectionObserver.
if (isBrowser)
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });

class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
if (isBrowser) Object.defineProperty(window, "IntersectionObserver", { writable: true, value: IO });
