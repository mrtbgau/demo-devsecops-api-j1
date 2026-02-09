module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  setupFiles: ['./tests/setup.js'],
  clearMocks: true,
  restoreMocks: true
};
