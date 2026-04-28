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
};

module.exports = createJestConfig(config);
