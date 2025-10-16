const fs = require('fs');
const path = require('path');

const presetPath = path.resolve(
  __dirname,
  '../src/services/PresetConfiguration.ts',
);
const enginePath = path.resolve(
  __dirname,
  '../src/services/CognitiveSoundscapeEngine.ts',
);

const presetText = fs.readFileSync(presetPath, 'utf8');
const engineText = fs.readFileSync(enginePath, 'utf8');

const presetRegex = /ambientTrack:\s*'([^']*)'/g;
const assetRegex = /['"]([^'"]+)['"]\s*:\s*require\(/g;

const presetMatches = [];
let m;
while ((m = presetRegex.exec(presetText)) !== null) {
  const f = m[1].trim();
  if (f) presetMatches.push(f);
}

const assetMatches = new Set();
while ((m = assetRegex.exec(engineText)) !== null) {
  assetMatches.add(m[1]);
}

console.log('Found presets ambientTrack values:');
console.log(presetMatches.join('\n'));
console.log('\nFound ASSET_MAP keys:');
console.log(Array.from(assetMatches).join('\n'));

const missing = presetMatches.filter((p) => p && !assetMatches.has(p));
if (missing.length === 0) {
  console.log(
    '\n✅ All preset ambientTrack filenames are present in ASSET_MAP',
  );
} else {
  console.log(
    '\n⚠️ Missing mappings for the following preset ambientTrack filenames:',
  );
  missing.forEach((x) => console.log(' -', x));
}

// Additional hygiene checks: file sizes and loop optimization
const assetDir = path.resolve(__dirname, '..', 'src', 'assets', 'audio');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function (file) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

try {
  const files = walk(assetDir);
  const large = files.filter((f) => fs.statSync(f).size > 10 * 1024 * 1024);
  if (large.length > 0) {
    console.warn(
      '\n⚠️ The following audio files exceed 10MB (consider optimizing):',
    );
    large.forEach((f) => console.warn(' -', path.relative(process.cwd(), f)));
  } else {
    console.log('\n✅ No audio file exceeds 10MB');
  }
} catch (e) {
  console.warn('Unable to run audio hygiene checks (assets may be missing)');
}

// Check for standardized filename prefixes
try {
  const allFiles = walk(
    path.resolve(__dirname, '..', 'src', 'assets', 'audio'),
  );
  const allowedPrefixes = [
    'binaural_',
    'ambient_',
    'ui_',
    'mixkit-',
    'forest-',
    'rain-',
    'soothing-',
  ];
  const nonStandard = allFiles.filter((f) => {
    const name = path.basename(f);
    return !allowedPrefixes.some((p) => name.startsWith(p));
  });

  if (nonStandard.length > 0) {
    console.warn(
      '\n⚠️ The following audio filenames do not follow the standard prefixes (binaural_, ambient_, ui_, mixkit-, etc.):',
    );
    nonStandard.forEach((f) =>
      console.warn(' -', path.relative(process.cwd(), f)),
    );
  } else {
    console.log('\n✅ All audio filenames match standard prefixes');
  }
} catch (e) {
  // ignore
}
