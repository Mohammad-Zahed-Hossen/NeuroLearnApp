#!/usr/bin/env bash
set -euo pipefail
npx expo prebuild --platform android --no-install || {
  echo "❌ expo prebuild failed"
  exit 1
}

echo "⚙️ Running Expo prebuild (CI friendly)..."
# Ensure non-interactive CI behavior for expo CLI
export CI=1

# Run prebuild for Android only, avoid installing dependencies in CI
npx expo prebuild --platform android --no-install || {
  echo "❌ expo prebuild failed"
  exit 1
}

echo "⚙️ Running Gradle fix script..."
node ./scripts/gradle-fix.js || {
  echo "❌ gradle-fix.js failed"
  exit 1
}

echo "✅ Prebuild + Gradle patch complete."
# run non-interactive and avoid running npm install here in case CI already sets up deps
npx expo prebuild --platform android --no-install --non-interactive || {
  echo "❌ expo prebuild failed. Dumping diagnostics..."
  # show last 200 lines of logs (if available)
  exit 1
}

echo "⚙️ Running Gradle fix script..."
node ./scripts/gradle-fix.js || {
  echo "❌ gradle-fix.js failed"
  exit 1
}

echo "✅ Prebuild + Gradle patch complete."
