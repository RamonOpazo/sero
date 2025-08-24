import '@testing-library/jest-dom/vitest';

// Mock IntersectionObserver for components that might use it
class MockIntersectionObserver implements IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  
  constructor() {}
  
  disconnect() {}
  observe() {}
  unobserve() {}
  
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

(global as any).IntersectionObserver = MockIntersectionObserver;

// Mock ResizeObserver for components that might use it
class MockResizeObserver implements ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

(global as any).ResizeObserver = MockResizeObserver;

// Mock matchMedia for responsive components
// During type checking build (tsc -b), vi is not in scope; fall back to no-op fns
const fn = (..._args: any[]) => undefined as any;
// no-op

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (typeof (globalThis as any).vi !== 'undefined'
    ? (globalThis as any).vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: (globalThis as any).vi.fn(),
        removeListener: (globalThis as any).vi.fn(),
        addEventListener: (globalThis as any).vi.fn(),
        removeEventListener: (globalThis as any).vi.fn(),
        dispatchEvent: (globalThis as any).vi.fn(),
      }))
    : ((_query: string) => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: fn,
        removeListener: fn,
        addEventListener: fn,
        removeEventListener: fn,
        dispatchEvent: fn,
      }))
  ),
});
