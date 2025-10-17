NeuroLearn dev-client helper

Purpose

- Builds a debug dev-client APK, installs it on a connected Android device (via adb), and starts Metro in dev-client mode.

What the script does (steps)

1. Runs `npx expo prebuild --platform android --no-install` to generate native Android project files.
2. Builds a debug APK using Gradle (`assembleDebug`).
3. Finds the produced APK under `android/app/build/outputs/apk/**`.
4. Attempts to install it via `adb install -r <apk>` (optional; will warn if adb not available).
5. Starts Metro in dev-client mode with `npx expo start --dev-client`.

How to run

- From the repository root (Linux/macOS/Windows with Git Bash or WSL):

```bash
# Recommended
npm run dev:client

# Or directly
node scripts/dev-client.js
```

- On Windows PowerShell you can run:

```powershell
npm run dev:client
```

Prerequisites

- Node.js (LTS)
- npx/expo-cli available (installed via `npm i -g expo-cli` or `npx`)
- Android SDK + platform-tools (adb) on PATH for installing APKs
- Java JDK and Gradle wrapper will be used by the Android build
- A connected Android device or emulator (for `adb install`)

Troubleshooting

- If the script fails during `expo prebuild`: ensure a clean git working tree and all required native plugin config is present.
- If Gradle fails: open `android` folder and run the gradle command manually to inspect errors. On macOS/Linux: `cd android && ./gradlew assembleDebug`. On Windows: `cd android && gradlew.bat assembleDebug`.
- If APK not found: ensure Gradle assembled successfully and look under `android/app/build/outputs/apk/`.
- If `adb` is not found: install Android platform-tools and add to PATH.
- To start Metro manually: `npx expo start --dev-client`.

Notes

- This script is intentionally conservative (it won't attempt to modify source files).
- Use this when the project requires native modules (Expo Go won't work). It helps iterate quickly by installing a dev-client build on your device.
