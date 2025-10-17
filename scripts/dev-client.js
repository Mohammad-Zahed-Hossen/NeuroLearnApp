#!/usr/bin/env node
// Cross-platform NeuroLearn Dev Client Builder (CommonJS)
// - Compatible with this repo's package.json (no `type: module` needed)

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const log = (msg) => console.log(`\x1b[36m[NeuroLearn]\x1b[0m ${msg}`);
const warn = (msg) => console.warn(`\x1b[33m⚠ ${msg}\x1b[0m`);
const error = (msg) => console.error(`\x1b[31m❌ ${msg}\x1b[0m`);

// Global handlers to surface any silent errors
process.on('uncaughtException', (err) => {
  console.error('\n[NeuroLearn] Uncaught Exception:');
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('\n[NeuroLearn] Unhandled Rejection:');
  console.error(reason && reason.stack ? reason.stack : String(reason));
  process.exit(1);
});

function run(command, options = {}) {
  log(`> ${command}`);
  try {
    execSync(command, { stdio: 'inherit', ...options });
  } catch (err) {
    error(`Command failed: ${command}`);
    // Re-throw to allow upstream handlers to display the error
    throw err;
  }
}

function fileExists(f) {
  try {
    return fs.existsSync(f);
  } catch {
    return false;
  }
}

function detectGradlew() {
  const gradlewUnix = path.join('android', 'gradlew');
  const gradlewWin = path.join('android', 'gradlew.bat');
  if (fileExists(gradlewUnix)) return gradlewUnix;
  if (fileExists(gradlewWin)) return gradlewWin;
  return null;
}
function killMetro() {
  try {
    if (os.platform() === 'win32') {
      // On Windows: use tasklist/taskkill to stop node.exe processes deterministically.
      try {
        log('killMetro: checking for node.exe processes via tasklist');
        const tlist = spawnSync('tasklist', ['/FI', 'IMAGENAME eq node.exe'], {
          encoding: 'utf8',
          timeout: 3000,
        });
        log(`killMetro: tasklist status=${tlist.status}`);
        const out = (tlist.stdout || '').toString();
        if (out && out.toLowerCase().includes('node.exe')) {
          log('killMetro: node.exe processes detected — running taskkill');
          const tkill = spawnSync('taskkill', ['/F', '/IM', 'node.exe'], {
            encoding: 'utf8',
            timeout: 5000,
          });
          log(
            `killMetro: taskkill status=${tkill.status} stdout=${(
              tkill.stdout || ''
            )
              .toString()
              .slice(0, 200)}`,
          );
        } else {
          log('killMetro: no node.exe processes found');
        }
      } catch (e) {
        warn('killMetro: tasklist/taskkill failed or timed out');
      }
    } else {
      // unix-like: try expo stop then kill port
      const opts = { stdio: 'ignore', timeout: 4000 };
      try {
        log('killMetro: running `npx expo stop` (unix)');
        const r1 = spawnSync('npx', ['expo', 'stop'], opts);
        log(`killMetro: npx exitStatus=${r1.status} signal=${r1.signal}`);
      } catch (e) {
        warn('killMetro: npx expo stop failed or timed out');
      }
      try {
        log('killMetro: running `lsof -ti :8081 | xargs -r kill -9`');
        const r2 = spawnSync(
          'bash',
          ['-c', 'lsof -ti :8081 | xargs -r kill -9'],
          opts,
        );
        log(`killMetro: lsof exitStatus=${r2.status} signal=${r2.signal}`);
      } catch (e) {
        warn('killMetro: lsof/kill failed or timed out');
      }
    }
    log('✅ Killed any running Metro bundlers (port 8081)');
  } catch (e) {
    warn('Could not kill Metro bundler. Continuing...');
  }
}

function findApk() {
  const base = path.join('android', 'app', 'build', 'outputs', 'apk');
  if (!fs.existsSync(base)) return null;
  const findApkRecursive = (dir) => {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        const res = findApkRecursive(full);
        if (res) return res;
      } else if (entry.endsWith('.apk')) {
        return full;
      }
    }
    return null;
  };
  return findApkRecursive(base);
}

function printHeader() {
  console.log('\n🚀 Starting NeuroLearn Dev Client Builder\n');
}

async function main() {
  printHeader();
  // Quick runtime info to help diagnose silent exits
  log(`PID=${process.pid} cwd=${process.cwd()} node=${process.version}`);

  // Environment checks - show versions for easier debugging
  for (const cmd of ['node', 'npx', 'expo']) {
    try {
      const ver = execSync(`${cmd} --version`, { encoding: 'utf8' }).trim();
      log(`${cmd} version: ${ver}`);
    } catch (err) {
      error(`${cmd} is not installed or not in PATH`);
      // include the error message for debugging
      console.error(err && err.message ? err.message : String(err));
      process.exit(1);
    }
  }
  // Diagnostic: confirm we passed version checks
  log('after version checks — proceeding to killMetro()');

  killMetro();

  // 1️⃣ Prebuild
  log('1) Running expo prebuild (android)...');
  try {
    run('npx expo prebuild --platform android --no-install');
  } catch (err) {
    error(
      'expo prebuild failed. Ensure you have a clean working tree and Android SDK installed.',
    );
    process.exit(1);
  }

  // 2️⃣ Gradle build
  const gradlew = detectGradlew();
  if (!gradlew) {
    error('Gradle wrapper not found. Run expo prebuild first.');
    process.exit(1);
  }

  log('2) Building debug APK via Gradle...');
  // Use correct gradle command depending on platform and gradlew path
  try {
    if (os.platform() === 'win32') {
      // gradlew may already be 'android\\gradlew.bat' — run it from repo root
      const winGradlew = gradlew.endsWith('.bat') ? gradlew : `${gradlew}.bat`;
      run(`cd android && ${winGradlew} assembleDebug`);
    } else {
      // ensure the wrapper is executable and call via ./gradlew
      run(
        `cd android && chmod +x ./gradlew || true && ./gradlew assembleDebug`,
      );
    }
  } catch (err) {
    error('Gradle build failed. See output above for details.');
    process.exit(1);
  }

  // 3️⃣ Find APK
  const apk = findApk();
  if (!apk) {
    error(
      'APK not found. Check Gradle output (android/app/build/outputs/apk/).',
    );
    process.exit(1);
  }
  log(`✅ Built APK: ${apk}`);

  // 4️⃣ Install on device
  try {
    run(`adb install -r "${apk}"`);
  } catch (e) {
    warn(
      '⚠️  Could not install via adb. Please install manually from APK path.',
    );
  }

  // 5️⃣ Start Metro
  log('5) Starting Metro for dev-client...');
  try {
    run('npx expo start --dev-client');
  } catch (e) {
    error(
      'Failed to start Metro. You can start it manually with: npx expo start --dev-client',
    );
    process.exit(1);
  }

  log('\n✅ All steps completed successfully!');
}

main().catch((err) => {
  error(err && err.message ? err.message : String(err));
  process.exit(1);
});
