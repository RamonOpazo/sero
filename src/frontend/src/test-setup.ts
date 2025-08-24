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
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
