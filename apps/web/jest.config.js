const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@makeforest/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@makeforest/db$': '<rootDir>/../../packages/db/src/index.ts',
  },
  collectCoverageFrom: [
    'shared/store/timerStore.ts',
    'shared/store/panelStore.ts',
    'shared/store/waterStore.ts',
  ],
  coverageThreshold: {
    global: { lines: 50, functions: 50, statements: 50 },
  },
};

module.exports = createJestConfig(config);
