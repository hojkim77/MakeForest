/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.logic.test.ts'],
  moduleNameMapper: {
    '^@makeforest/types$': '<rootDir>/../../packages/types/src/index.ts',
  },
  collectCoverageFrom: [
    'src/routes/*.logic.ts',
  ],
  coverageThreshold: {
    global: { lines: 60, functions: 60, branches: 50, statements: 60 },
  },
};
