#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔊 Validating audio assets...');

const audioDir = path.join(__dirname, '..', 'src', 'assets', 'audio');
const requiredDirs = [
  'ambient_soundscapes/nature',
  'ambient_soundscapes/environments',
  'ambient_soundscapes/sci-fi',
  'binaural_beats/alpha',
  'binaural_beats/beta',
  'binaural_beats/gamma',
  'binaural_beats/theta',
  'ui_sounds'
];

function validateAudioAssets() {
  if (!fs.existsSync(audioDir)) {
    console.error('❌ Audio directory not found:', audioDir);
    console.log('💡 Run: node scripts/generate-audio-files.js to create structure');
    return false;
  }

  let allValid = true;

  requiredDirs.forEach(dir => {
    const fullPath = path.join(audioDir, dir);
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Missing audio directory: ${dir}`);
      allValid = false;
    } else {
      const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
      if (files.length === 0) {
        console.log(`❌ No audio files in: ${dir}`);
        allValid = false;
      } else {
        console.log(`✅ ${dir}: ${files.length} files`);
      }
    }
  });

  return allValid;
}

// File format validation
function validateFileFormats() {
  console.log('\n🎵 FILE FORMAT RECOMMENDATIONS:');
  console.log('================================');
  console.log('MP3 Files (Ambient/Binaural):');
  console.log('   • Sample Rate: 44.1kHz');
  console.log('   • Bit Rate: 128-192kbps');
  console.log('   • Channels: Stereo (for binaural beats)');
  console.log('   • Loop: Seamless (no clicks/pops)');
  console.log('');
  console.log('WAV Files (UI Sounds):');
  console.log('   • Sample Rate: 44.1kHz');
  console.log('   • Bit Depth: 16-bit');
  console.log('   • Channels: Mono or Stereo');
  console.log('   • Duration: <3 seconds');
}

// Main execution
if (require.main === module) {
  const isValid = validateAudioAssets();
  validateFileFormats();

  if (isValid) {
    console.log('\n🎉 All audio assets validated successfully!');
  } else {
    console.log('\n⚠️  Some audio assets are missing or invalid.');
  }

  process.exit(isValid ? 0 : 1);
}

module.exports = {
  validateAudioAssets
};
