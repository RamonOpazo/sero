import type { Config } from 'jest';

const config: Config = {
  // Use jsdom environment for React testing
  testEnvironment: 'jsdom',
  
  // Enable ESM support
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Module name mapping for path aliases (matching your Vite config)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Handle CSS imports (mock them)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx)',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  
  // Transform configuration for ESM
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.jest.json',
      },
    ],
  },
  
  // Handle module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
};

export default config;
