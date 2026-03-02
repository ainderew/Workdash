import "@testing-library/jest-dom";

// Mock window.__BACKEND_JWT__ for SSR-safe tests
Object.defineProperty(window, "__BACKEND_JWT__", {
  value: "test-jwt-token",
  writable: true,
  configurable: true,
});

// Mock window.__BACKEND_USER__ for tests that reference the local user
Object.defineProperty(window, "__BACKEND_USER__", {
  value: { id: 1, name: "Test User", email: "test@test.com" },
  writable: true,
  configurable: true,
});

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
