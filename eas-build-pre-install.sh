#!/usr/bin/env bash
set -euo pipefail
echo "⚙️ Running EAS pre-install helper (CI friendly)..."

# Ensure non-interactive CI behavior for commands invoked here
export CI=1

# Install project dependencies so that locally required CLI modules (expo, etc.)
# are available during this pre-install phase. EAS build environments may not
# have run `npm install` before pre-install hooks, so installing here prevents
# errors such as "Cannot find module 'expo'".
echo "👉 Installing production dependencies (npm ci)..."
# Use --no-audit and --no-fund to keep output concise in CI
npm ci --prefer-offline --no-audit --no-fund || {
  echo "❌ npm ci failed"
  exit 1
}

echo "✅ Dependencies installed. Running expo prebuild (android, non-interactive)..."
# Run a single non-interactive prebuild for Android and avoid modifying node_modules
npx expo prebuild --platform android --no-install --non-interactive || {
  echo "❌ expo prebuild failed. Dumping diagnostics..."
  # Show some diagnostics
  echo "--- node and npm versions ---"
  node --version || true
  npm --version || true
  echo "--- ls -la ---"
  ls -la || true
  exit 1
}

echo "⚙️ Running Gradle fix script..."
node ./scripts/gradle-fix.js || {
  echo "❌ gradle-fix.js failed"
  exit 1
}

echo "✅ Prebuild + Gradle patch complete."
