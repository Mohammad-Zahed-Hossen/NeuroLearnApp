# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.
``

Project scope
- Expo (React Native + TypeScript) mobile app with optional web target.
- Supabase-first backend via Edge Functions and typed client integration.
- Domain-oriented structure: learning, focus/productivity, finance, health/wellness, notifications, and AI services.

Common commands
- Install dependencies
  - npm install
- Start development server (Metro + Expo)
  - npm start
- Run on platforms
  - iOS simulator: npm run ios
  - Android emulator/device: npm run android
  - Web (Expo web): npm run web
- Tests (Jest + Testing Library)
  - All tests: npm test
  - Single test by file: npm test -- path/to/testfile.test.tsx
  - Single test by name: npm test -- -t "test name"
- Pre-build checks and Android builds
  - Prebuild (generate native projects + patch Gradle): npm run prebuild-android
  - Android debug APK: npm run android-build
  - Android release (CI-style): npm run build:ci
  - EAS local Android build: npm run build:local
- Environment and backend
  - Bootstrap .env and Supabase scaffolding: npm run setup-env
    - Note: setup-env.sh is a Bash script; on Windows use Git Bash or WSL
  - Deploy Supabase Edge Functions (after setup): npm run setup-backend
- Audio asset tooling
  - Validate bundled audio assets: npm run validate-audio-assets
  - Regenerate audio files: npm run generate-audio-files
- Troubleshooting helpers
  - Clear Expo/Metro cache: npx expo start --clear
  - Reset Metro cache: npx react-native start --reset-cache
  - Fix Android Gradle duplicate issues: npm run fix-android-dup
  - Clean Android build (Windows): .\android\gradlew.bat clean

High-level architecture
- Entrypoints
  - index.ts: registers the app with Expo (registerRootComponent).
  - App.tsx: top-level component controlling screen selection, shell UI, and auth gating.
    - Maintains a lightweight navigation stack in local state and toggles overlays (command palette, FAB sheet, mini player).
    - Wires authentication via SupabaseService.getInstance() and gates between auth and app states.
- Configuration and environment
  - app.config.js loads environment via dotenv and exposes values to the app under expo.extra.
    - extra: SUPABASE_URL, SUPABASE_ANON_KEY, ENCRYPTION_KEY
    - SupabaseService reads these through expo-constants; ensure .env defines them.
  - eas.json defines development/preview/production channels and Android build types (apk/aab).
  - babel.config.js includes Expo preset, NativeWind, and react-native-worklets plugin (must remain last).
  - metro.config.js tweaks resolver for Reanimated v4.
- Core UI and features (src/)
  - components/: Reusable UI, grouped by domain (ai, finance, health, learning, navigation, shared).
  - screens/: Feature pages organized by domain (Focus & Productivity, Learning Tools, finance, health, wellness, profile, shared).
  - navigation/: Navigator components and types. App.tsx currently drives navigation state directly while still importing navigator utilities.
  - contexts/: Cross-cutting providers (e.g., FocusContext, SoundscapeContext, CognitiveProvider) enabling cognitive-state–driven UI adaptation.
    - CognitiveProvider integrates focus and soundscape state, tracks cognitive load metrics, and auto-adjusts UI mode.
  - store/: Centralized state per domain (aiStore, financeStore, healthStore, notificationStore, uiStore). Used by screens/services to coordinate app state.
  - services/: Domain services and integrations
    - storage/: SupabaseService (typed client, RLS-aware auth/session), HybridStorageService/MMKV wrappers, schema helpers.
    - ai/: Gemini-backed orchestration (prompt builder, parsers, insights services) and trigger logic.
    - learning/: Core engines (Spaced Repetition/FSRS, speed reading, mind map generator, audio loader, physics worker) and helpers.
    - health/, finance/, notifications/, analytics/: Feature-specific business logic and integrations.
  - config/: Feature flags (app.config.ts), hub card registry (hubConfig.ts), analytics/notifications settings, and app constants.
  - assets/: Fonts, icons, and extensive audio library (ambient soundscapes, binaural beats, UI sounds). Audio validation/regeneration is handled by npm scripts.
- Supabase backend (supabase/)
  - functions/: Edge Functions grouped by domain (ai, analytics, finance, health, learning, notifications), each with index.ts entry.
  - migrations/: Versioned SQL for schema evolution (health, finance, etc.).
  - seed/: Initial data (achievements, categories, samples, test users).
  - types/: Generated/handwritten TypeScript types for DB and function interfaces.
- Testing
  - Jest with ts-jest preset and jsdom environment.
  - Test discovery: src/**/__tests__/**/* and __tests__/**/*.
  - React Native and Expo modules are mapped/mocked via moduleNameMapper; transformIgnorePatterns allow specific RN packages to be transformed.

Notes distilled from README.md
- Quick start: npm install, npm run setup-env, npm start, then npm run ios / npm run android / npm run web.
- Android prebuild and build flows: npm run prebuild-android, npm run android-build, npm run build:ci; EAS local build via npm run build:local.
- Supabase setup via npm run setup-backend once the CLI and .env are configured.
- Troubleshooting commands: expo/metro cache reset and Gradle cleanup/fix.

What’s intentionally omitted
- Generic coding guidelines and broad best practices (see repository docs/README for full details if added later).
- Exhaustive file or component listings (the structure above is the big-picture map).
