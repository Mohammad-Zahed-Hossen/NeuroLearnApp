import 'dotenv/config';

export default {
  expo: {
    name: 'NeuroLearn',
    slug: 'NeuroLearn',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/NeuroLearn.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      // Android prebuild does not accept SVGs for splash images.
      // Use the PNG asset variant instead.
      image: './assets/NeuroLearn.png',
      resizeMode: 'contain',
      backgroundColor: '#8B5CF6',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier:
        process.env.IOS_BUNDLE_IDENTIFIER || 'com.neurolearn.app',
    },
    android: {
      package: process.env.ANDROID_PACKAGE || 'com.neurolearn.app',
      adaptiveIcon: {
        foregroundImage: './assets/NeuroLearn.png',
        backgroundColor: '#8B5CF6',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    scheme: 'neurolearn',
    deepLinking: {
      scheme: 'neurolearn',
      prefixes: ['neurolearn://'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    // Include the expo-dev-client plugin so development client builds work on EAS
    plugins: ['expo-dev-client'],
    extra: {
      eas: {
        projectId: 'c77c860d-df8d-4d62-81b0-50610e216d9b',
      },
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      // Only expose public client IDs and redirect URIs - secrets stay server-side
      EXPO_PUBLIC_TODOIST_CLIENT_ID: process.env.EXPO_PUBLIC_TODOIST_CLIENT_ID,
      EXPO_PUBLIC_NOTION_CLIENT_ID: process.env.EXPO_PUBLIC_NOTION_CLIENT_ID,
    },
  },
};
