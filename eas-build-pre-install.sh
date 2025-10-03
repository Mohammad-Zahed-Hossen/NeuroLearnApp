#!/usr/bin/env bash
set -euo pipefail
echo "⚙️ Running Expo prebuild..."
npx expo prebuild

echo "⚙️ Running Gradle fix script..."
node ./scripts/gradle-fix.js

echo "✅ Prebuild + Gradle patch complete."
