/** Jest configuration for the NeuroLearnApp project */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    moduleNameMapper: {
      '^react-native-audio-api$': '<rootDir>/__mocks__/react-native-audio-api.ts',
      '^react-native$': '<rootDir>/__mocks__/react-native.ts',
      '^expo-linear-gradient$': '<rootDir>/__mocks__/expo-linear-gradient.js',
      '\\.(mp3|wav)$': '<rootDir>/__mocks__/fileMock.js',
    },
    transform: {
      '^.+\\.(ts|tsx)$': ['ts-jest', {
        tsconfig: {
          jsx: 'react-jsx',
        },
      }],
    },
    transformIgnorePatterns: [
      '/node_modules/(?!react-native-audio-api|@react-native|react-native|expo-constants|expo-linear-gradient|react-native-vector-icons)/'
    ],
    setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
    testMatch: [
      '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
      '<rootDir>/__tests__/**/*.(ts|tsx|js|jsx)',
    ],
    collectCoverageFrom: [
      'src/**/*.(ts|tsx)',
      '!src/**/*.d.ts',
    ],
  };
