import "@testing-library/jest-dom";
import { tokenStore } from "@/common/utils/tokenStore";

// Stub canvas 2D context so libraries like lottie-web that call
// getContext('2d') at module load time don't throw in the test env.
HTMLCanvasElement.prototype.getContext = (() => {
  const original = HTMLCanvasElement.prototype.getContext;
  return function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
    if (contextId === "2d") {
      const noop = () => {};
      return {
        fillStyle: "",
        fillRect: noop,
        clearRect: noop,
        getImageData: () => ({ data: new Uint8ClampedArray(0) }),
        putImageData: noop,
        createImageData: () => ({ data: new Uint8ClampedArray(0) }),
        setTransform: noop,
        drawImage: noop,
        save: noop,
        restore: noop,
        beginPath: noop,
        moveTo: noop,
        lineTo: noop,
        closePath: noop,
        stroke: noop,
        translate: noop,
        scale: noop,
        rotate: noop,
        arc: noop,
        fill: noop,
        measureText: () => ({ width: 0 }),
        transform: noop,
        rect: noop,
        clip: noop,
        canvas: this,
      } as unknown as CanvasRenderingContext2D;
    }
    return original.call(this, contextId, ...args) as RenderingContext | null;
  };
})() as typeof HTMLCanvasElement.prototype.getContext;

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
