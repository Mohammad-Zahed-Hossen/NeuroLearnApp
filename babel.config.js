// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    // FIX: Moving 'nativewind/babel' to presets helps resolve conflicts
    presets: ['babel-preset-expo', 'nativewind/babel'],

    plugins: [
      // Reanimated v4 plugin path. This MUST be the last item.
      'react-native-reanimated/plugin',
    ],
  };
};
