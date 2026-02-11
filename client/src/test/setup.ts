import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

// Polyfill localStorage for happy-dom if it's not properly available
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.getItem !== "function") {
  const store: Record<string, string> = {};
  const localStoragePolyfill = {
    getItem(key: string): string | null {
      return key in store ? store[key] : null;
    },
    setItem(key: string, value: string): void {
      store[key] = String(value);
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key(index: number): string | null {
      const keys = Object.keys(store);
      return keys[index] ?? null;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: localStoragePolyfill,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, "localStorage", {
    value: localStoragePolyfill,
    writable: true,
    configurable: true,
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => {
  cleanup();
  localStorage.clear();
  server.resetHandlers();
});
afterAll(() => server.close());
