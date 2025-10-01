/** Jest configuration for the NeuroLearnApp project */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^react-native-audio-api$': '<rootDir>/__mocks__/react-native-audio-api.ts',
    '^react-native$': '<rootDir>/__mocks__/react-native.ts',
    '\\.(mp3|wav)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transformIgnorePatterns: ['/node_modules/(?!react-native-audio-api)'],
};
