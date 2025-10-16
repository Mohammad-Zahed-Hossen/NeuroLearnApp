/** Jest configuration for the NeuroLearnApp project */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^react-native-audio-api$': '<rootDir>/__mocks__/react-native-audio-api.ts',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^expo-linear-gradient$': '<rootDir>/__mocks__/expo-linear-gradient.js',
    '\\.(mp3|wav)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Allow transforming some node_modules that include ESM/TypeScript or
  // react-native codegen helpers which Jest needs to transform.
  transformIgnorePatterns: [
    '/node_modules/(?!(@react-native|react-native|react-native-safe-area-context|react-native-vector-icons|expo-linear-gradient|expo-constants|@react-navigation|@unimodules)/)',
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/__tests__/**/*.(ts|tsx|js|jsx)',
  ],
  collectCoverageFrom: ['src/**/*.(ts|tsx)', '!src/**/*.d.ts'],
  // Performance testing configuration
  testEnvironmentOptions: {
    // Enable performance monitoring in tests
    performance: true,
  },
  // Add performance test setup
  globalSetup: '<rootDir>/jest.performance-setup.js',
  globalTeardown: '<rootDir>/jest.performance-teardown.js',
};
