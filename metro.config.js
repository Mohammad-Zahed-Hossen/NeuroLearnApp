// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for reanimated v4
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-reanimated': 'react-native-reanimated',
};

module.exports = config;
