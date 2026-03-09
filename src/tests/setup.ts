import "@testing-library/jest-dom";
import { tokenStore } from "@/common/utils/tokenStore";

// Seed tokenStore for SSR-safe tests
tokenStore.setJwt("test-jwt-token");
tokenStore.setUser({ id: 1, name: "Test User", email: "test@test.com" });

// Mock localStorage for SSR-safe tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
