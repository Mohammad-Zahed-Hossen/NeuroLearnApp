#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.cwd());
const nm = path.join(root, 'node_modules');

if (!fs.existsSync(nm)) {
  console.error('node_modules not found. Run npm install first.');
  process.exit(1);
}

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

const matches = [];
walk(nm, (file) => {
  if (!file.endsWith('AndroidManifest.xml')) return;
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('package="')) {
      matches.push(file);
    }
  } catch (e) {
    // ignore
  }
});

if (matches.length === 0) {
  console.log(
    'No AndroidManifest.xml files with package="..." found in node_modules.',
  );
  process.exit(0);
}

console.log(
  `Found ${matches.length} AndroidManifest.xml files with package attributes:`,
);
matches.forEach((p) => console.log(' -', p));

if (process.argv.includes('--apply')) {
  console.log('\nApplying fixes (backups will be created with .bak extension)');
  for (const file of matches) {
    const content = fs.readFileSync(file, 'utf8');
    const backup = `${file}.bak`;
    if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
    const fixed = content.replace(/package="[^"]+"/g, '');
    fs.writeFileSync(file, fixed, 'utf8');
    console.log('Fixed', file);
  }
  console.log('\nDone. Please rebuild your Android project to verify.');
} else {
  console.log(
    '\nRun with --apply to remove the package="..." attributes (creates .bak backups)',
  );
  process.exit(0);
}



/*
# restore all .bak files under node_modules (careful—only do if you want the originals back)
Get-ChildItem -Path .\node_modules -Filter "*.bak" -Recurse | ForEach-Object {
  $bak = $_.FullName
  $orig = $bak -replace '\.bak$',''
  Copy-Item -Path $bak -Destination $orig -Force
}
  
*/
