#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

function exitNotFound() {
  console.error(
    '❌ Could not find android/app/build.gradle. Did you run `npx expo prebuild`?',
  );
  process.exit(1);
}

if (!fs.existsSync(gradlePath)) exitNotFound();

let gradle = fs.readFileSync(gradlePath, 'utf8');
let changed = false;

// 1) Ensure SoLoader implementation exists
if (!/com\.facebook\.soloader:soloader/.test(gradle)) {
  gradle = gradle.replace(
    /(dependencies\s*\{)/,
    '$1\n    // Auto-added to ensure SoLoader is available for autolinking\n    implementation "com.facebook.soloader:soloader:0.12.0"\n',
  );
  changed = true;
  console.log('🔧 Added com.facebook.soloader:soloader dependency');
} else {
  console.log('ℹ️ SoLoader dependency already present, skipping');
}

// 2) Ensure packagingOptions pickFirst for native libs exists under android { packagingOptions { jniLibs { pickFirst '**/*.so' } } }
if (!/pickFirst\s+\'\*\*\/.+\.so\'/.test(gradle)) {
  // Try to find existing packagingOptions jniLibs block
  if (/packagingOptions\s*\{[^}]*jniLibs\s*\{/.test(gradle)) {
    // insert pickFirst inside the jniLibs block
    gradle = gradle.replace(
      /(jniLibs\s*\{)/,
      "$1\n            // Auto-added to avoid native .so duplication during merging\n            pickFirst '**/*.so'\n",
    );
    changed = true;
    console.log('🔧 Inserted pickFirst into existing packagingOptions.jniLibs');
  } else if (/android\s*\{/.test(gradle)) {
    // Insert a packagingOptions block into the android block
    gradle = gradle.replace(
      /(android\s*\{)/,
      "$1\n    // Auto-added packagingOptions to prefer the first native libs when merging\n    packagingOptions {\n        jniLibs {\n            pickFirst '**/*.so'\n        }\n    }\n",
    );
    changed = true;
    console.log('🔧 Added packagingOptions.jniLibs.pickFirst to android block');
  } else {
    console.warn(
      '⚠️ Could not find an android { } block to insert packagingOptions into. Please patch manually.',
    );
  }
} else {
  console.log('ℹ️ packagingOptions pickFirst already present, skipping');
}

if (changed) {
  fs.writeFileSync(gradlePath, gradle, 'utf8');
  console.log('✅ Gradle file patched successfully.');
} else {
  console.log('✅ Nothing to change. build.gradle is already patched.');
}
