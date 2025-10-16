#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying NeuroLearn APK setup...\n');

const checks = [
  {
    name: 'GitHub Actions Workflow',
    path: '.github/workflows/build-apk.yml',
    critical: true
  },
  {
    name: 'EAS Configuration',
    path: 'eas.json',
    critical: false
  },
  {
    name: 'Gradle Fix Script',
    path: 'scripts/gradle-fix.js',
    critical: true
  },
  {
    name: 'EAS Pre-install Hook',
    path: 'eas-build-pre-install.sh',
    critical: false
  },
  {
    name: 'Package.json Scripts',
    path: 'package.json',
    critical: true
  }
];

let allCriticalPassed = true;

checks.forEach(check => {
  const exists = fs.existsSync(check.path);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${check.name}: ${exists ? 'Found' : 'MISSING'}`);

  if (!exists && check.critical) {
    allCriticalPassed = false;
  }
});

// Check package.json for required scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['prebuild-android', 'android-build'];
const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);

if (missingScripts.length > 0) {
  console.log(`❌ Missing scripts in package.json: ${missingScripts.join(', ')}`);
  allCriticalPassed = false;
} else {
  console.log('✅ All required package.json scripts found');
}

console.log('\n📊 SUMMARY:');
if (allCriticalPassed) {
  console.log('🎉 All critical components are ready!');
  console.log('🚀 You can now:');
  console.log('   1. Push to GitHub to trigger APK builds');
  console.log('   2. Continue developing in Expo Go');
  console.log('   3. Share APKs with friends via GitHub');
} else {
  console.log('⚠️  Some critical components are missing.');
  console.log('   Please create the missing files above.');
}

// Check for duplicate script
if (fs.existsSync('scripts/ensure-android-gradle-fix.js')) {
  console.log('\n⚠️  Found duplicate script: ensure-android-gradle-fix.js');
  console.log('   Consider removing it to avoid confusion');
}
