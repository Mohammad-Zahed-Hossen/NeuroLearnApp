#!/usr/bin/env node
/**
 * 🔧 NeuroLearn App Recovery & EAS Build Script (Cross-Platform)
 * -------------------------------------------------------------
 * Safe for Windows, macOS, and Linux.
 * Cleans, reinstalls, prebuilds, and triggers an EAS build.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const run = (cmd, opts = {}) => {
  console.log(`\n👉 Running: ${cmd}\n`);
  try {
    execSync(cmd, { stdio: 'inherit', ...opts });
  } catch (err) {
    console.error(`❌ Command failed: ${cmd}`);
    console.error(err.message);
    // Don’t stop if non-critical command
    if (!cmd.includes('watchman') && !cmd.includes('cache')) {
      process.exit(1);
    }
  }
};

const confirm = (msg) => console.log(`✅ ${msg}`);

// --- STEP 1: Clean environment ---
console.log(`\n🧹 Cleaning environment...`);

const folders = [
  'node_modules',
  '.expo',
  '.gradle',
  'android/app/build',
  'android/build',
  'ios/build',
];

folders.forEach((folder) => {
  const fullPath = path.resolve(process.cwd(), folder);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`   🗑️ Removed ${folder}`);
  }
});

// Windows-safe cleaning
if (os.platform() === 'win32') {
  console.log('⚙️  Skipping watchman cleanup (not required on Windows).');
} else {
  run('watchman watch-del-all || true');
}

run('npm cache clean --force');
confirm('Cache and build folders cleared.');

// --- STEP 2: Install dependencies ---
run('npm install');
confirm('Dependencies reinstalled successfully.');

// --- STEP 3: Verify Expo & EAS ---
console.log('\n🔍 Checking Expo & EAS...');
try {
  execSync('expo --version', { stdio: 'inherit' });
} catch {
  run('npm install -g expo-cli');
}
try {
  execSync('eas --version', { stdio: 'inherit' });
} catch {
  run('npm install -g eas-cli');
}
confirm('Expo CLI and EAS CLI ready.');

// --- STEP 4: Prebuild (recreate android/ios) ---
console.log('\n🧱 Running expo prebuild...');
run('npx expo prebuild --platform android --non-interactive');
confirm('Native Android project rebuilt.');

// --- STEP 5: Trigger EAS build (development profile) ---
console.log('\n🚀 Starting EAS build for Android (development client)...');
run('eas build --platform android --profile development --non-interactive');
confirm('EAS build started successfully.');

// --- STEP 6: Final user guide ---
console.log(`
📲 When build completes:
1. Open: https://expo.dev/accounts/zahed_hossen/projects/neurolearnapp/builds
2. Download the APK (dev client) — e.g. neurolearnapp-dev.apk
3. Transfer to your Android device and install.
4. Start Metro in dev-client mode:
   👉 expo start --dev-client
5. Open the installed app → it will connect automatically.

💡 If you get connection issues:
   expo start -c
   (clear cache)
`);

confirm('🎉 Environment clean-up and EAS build complete.');
