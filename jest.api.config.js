module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  // Look for API-focused tests; safe if none exist
  testMatch: [
    '<rootDir>/src/api/**/*.test.ts',
    '<rootDir>/src/api/**/*.spec.ts',
    '<rootDir>/tests/api/**/*.test.ts',
    '<rootDir>/tests/api/**/*.spec.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  verbose: true,
  detectOpenHandles: true,
  testTimeout: 30000,
};