/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.integration.test.ts'],
  globalSetup: '<rootDir>/src/__tests__/setup/globalSetup.js',
  globalTeardown: '<rootDir>/src/__tests__/setup/globalTeardown.js',
  moduleNameMapper: {
    // Redirect ioredis to in-memory mock — keeps @makeforest/redis helpers working
    '^ioredis$': 'ioredis-mock',
    '^@makeforest/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@makeforest/db$': '<rootDir>/../../packages/db/src/index.ts',
    '^@makeforest/redis$': '<rootDir>/../../packages/redis/src/index.ts',
  },
  // Increase timeout for testcontainers startup
  testTimeout: 30000,
  // Force exit after all tests complete — route handler void blocks may still
  // be pending when the container shuts down, causing "Cannot log after tests" noise
  forceExit: true,
};
