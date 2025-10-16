/**
 * Audio File Generation Script for NeuroLearn Cognitive Soundscapes
 * 
 * This script helps generate the required audio files for the soundscape system.
 * Run with: node scripts/generate-audio-files.js
 */

const fs = require('fs');
const path = require('path');

// Audio file specifications
const AUDIO_SPECS = {
  // Binaural Beats (Generate using Web Audio API or Audacity)
  binaural_beats: {
    'alpha/alpha_10hz_focus.mp3': {
      description: '10Hz Alpha binaural beats with 340Hz carrier',
      duration: '30 minutes',
      leftFreq: 340,
      rightFreq: 350,
      volume: 0.3,
      format: 'MP3, 44.1kHz, 128kbps'
    },
    'alpha/alpha_8hz_calm.mp3': {
      description: '8Hz Alpha binaural beats with 340Hz carrier',
      duration: '30 minutes',
      leftFreq: 340,
      rightFreq: 348,
      volume: 0.3,
      format: 'MP3, 44.1kHz, 128kbps'
    },
    'beta/beta_18hz_concentrate.mp3': {
      description: '18Hz Beta binaural beats with 340Hz carrier',
      duration: '30 minutes',
      leftFreq: 340,
      rightFreq: 358,
      volume: 0.3,
      format: 'MP3, 44.1kHz, 128kbps'
    },
    'gamma/gamma_40hz_learning.mp3': {
      description: '40Hz Gamma binaural beats with 340Hz carrier',
      duration: '30 minutes',
      leftFreq: 340,
      rightFreq: 380,
      volume: 0.3,
      format: 'MP3, 44.1kHz, 128kbps'
    },
    'theta/theta_5hz_meditation.mp3': {
      description: '5Hz Theta binaural beats with 340Hz carrier',
      duration: '30 minutes',
      leftFreq: 340,
      rightFreq: 345,
      volume: 0.3,
      format: 'MP3, 44.1kHz, 128kbps'
    }
  },

  // Ambient Soundscapes (Download from royalty-free sources)
  ambient_soundscapes: {
    'nature/ambient_rain_light.mp3': {
      description: 'Light rain sounds for relaxation',
      duration: '20 minutes',
      sources: ['Pixabay', 'Mixkit', 'Freesound.org'],
      keywords: 'light rain, gentle rain, rain ambience',
      volume: 0.5,
      format: 'MP3, 44.1kHz, 192kbps'
    },
    'nature/ambient_forest.mp3': {
      description: 'Forest sounds with birds and wind',
      duration: '25 minutes',
      sources: ['Pixabay', 'Mixkit', 'Freesound.org'],
      keywords: 'forest ambience, birds, nature sounds',
      volume: 0.5,
      format: 'MP3, 44.1kHz, 192kbps'
    },
    'nature/ambient_waves.mp3': {
      description: 'Ocean waves for memory enhancement',
      duration: '30 minutes',
      sources: ['Pixabay', 'Mixkit', 'Freesound.org'],
      keywords: 'ocean waves, sea sounds, water ambience',
      volume: 0.5,
      format: 'MP3, 44.1kHz, 192kbps'
    },
    'environments/ambient_cyber_library.mp3': {
      description: 'Digital library ambience with subtle tech sounds',
      duration: '20 minutes',
      sources: ['Custom creation', 'Zapsplat'],
      keywords: 'library ambience, quiet space, digital sounds',
      volume: 0.4,
      format: 'MP3, 44.1kHz, 192kbps'
    },
    'environments/ambient_coffee_shop.mp3': {
      description: 'Coffee shop background noise',
      duration: '25 minutes',
      sources: ['Pixabay', 'Mixkit', 'Freesound.org'],
      keywords: 'coffee shop, cafe ambience, background chatter',
      volume: 0.6,
      format: 'MP3, 44.1kHz, 192kbps'
    }
  },

  // UI Sounds (Short notification sounds)
  ui_sounds: {
    'ui_session_start.wav': {
      description: 'Pleasant chime for session start',
      duration: '2 seconds',
      sources: ['Zapsplat', 'Freesound.org'],
      keywords: 'chime, bell, notification, start',
      volume: 0.7,
      format: 'WAV, 44.1kHz, 16-bit'
    },
    'ui_session_end.wav': {
      description: 'Completion sound for session end',
      duration: '3 seconds',
      sources: ['Zapsplat', 'Freesound.org'],
      keywords: 'completion, success, end, achievement',
      volume: 0.7,
      format: 'WAV, 44.1kHz, 16-bit'
    },
    'ui_button_click.wav': {
      description: 'Subtle click for UI interactions',
      duration: '0.2 seconds',
      sources: ['Zapsplat', 'Freesound.org'],
      keywords: 'click, button, UI, interface',
      volume: 0.5,
      format: 'WAV, 44.1kHz, 16-bit'
    }
  }
};

// Audio sources and tools
const RESOURCES = {
  binauralBeatGenerators: [
    'https://mynoise.net/NoiseMachines/binauralBrainwaveGenerator.php',
    'https://www.szynalski.com/tone-generator/',
    'Audacity (Generate > Tone... for each ear separately)',
    'Online Binaural Beat Generator tools'
  ],
  
  ambientSources: [
    'https://pixabay.com/sound-effects/',
    'https://mixkit.co/free-sound-effects/',
    'https://freesound.org/',
    'https://www.zapsplat.com/ (requires free account)'
  ],
  
  audioEditingTools: [
    'Audacity (Free) - https://www.audacityteam.org/',
    'Ocenaudio (Free) - https://www.ocenaudio.com/',
    'Adobe Audition (Paid)',
    'Logic Pro (Mac, Paid)',
    'Ableton Live (Paid)'
  ]
};

function generateAudioManifest() {
  const audioDir = path.join(__dirname, '..', 'src', 'assets', 'audio');
  
  console.log('🎵 NeuroLearn Audio File Generation Guide');
  console.log('==========================================\n');
  
  console.log('📁 Required Directory Structure:');
  console.log(`${audioDir}/`);
  console.log('├── binaural_beats/');
  console.log('│   ├── alpha/');
  console.log('│   ├── beta/');
  console.log('│   ├── gamma/');
  console.log('│   └── theta/');
  console.log('├── ambient_soundscapes/');
  console.log('│   ├── nature/');
  console.log('│   └── environments/');
  console.log('└── ui_sounds/\n');

  // Generate detailed specifications for each category
  Object.entries(AUDIO_SPECS).forEach(([category, files]) => {
    console.log(`\n🎧 ${category.toUpperCase().replace('_', ' ')}`);
    console.log('='.repeat(category.length + 4));
    
    Object.entries(files).forEach(([filename, spec]) => {
      console.log(`\n📄 ${filename}`);
      console.log(`   Description: ${spec.description}`);
      console.log(`   Duration: ${spec.duration}`);
      console.log(`   Format: ${spec.format}`);
      console.log(`   Volume: ${spec.volume}`);
      
      if (spec.leftFreq && spec.rightFreq) {
        console.log(`   Left Ear: ${spec.leftFreq}Hz`);
        console.log(`   Right Ear: ${spec.rightFreq}Hz`);
        console.log(`   Beat Frequency: ${spec.rightFreq - spec.leftFreq}Hz`);
      }
      
      if (spec.sources) {
        console.log(`   Sources: ${spec.sources.join(', ')}`);
      }
      
      if (spec.keywords) {
        console.log(`   Keywords: ${spec.keywords}`);
      }
    });
  });

  console.log('\n\n🛠️  GENERATION TOOLS & RESOURCES');
  console.log('==================================');
  
  console.log('\n🎵 Binaural Beat Generators:');
  RESOURCES.binauralBeatGenerators.forEach(tool => {
    console.log(`   • ${tool}`);
  });
  
  console.log('\n🌊 Ambient Sound Sources:');
  RESOURCES.ambientSources.forEach(source => {
    console.log(`   • ${source}`);
  });
  
  console.log('\n🎛️  Audio Editing Tools:');
  RESOURCES.audioEditingTools.forEach(tool => {
    console.log(`   • ${tool}`);
  });

  console.log('\n\n📋 STEP-BY-STEP GENERATION PROCESS');
  console.log('===================================');
  
  console.log('\n1. CREATE BINAURAL BEATS:');
  console.log('   • Use Audacity: Generate > Tone...');
  console.log('   • Create two mono tracks with specified frequencies');
  console.log('   • Pan left track fully left, right track fully right');
  console.log('   • Export as MP3, 44.1kHz, 128kbps');
  console.log('   • Ensure seamless looping (fade in/out at loop points)');
  
  console.log('\n2. DOWNLOAD AMBIENT SOUNDS:');
  console.log('   • Search royalty-free sites using provided keywords');
  console.log('   • Download high-quality files (44.1kHz minimum)');
  console.log('   • Edit for seamless looping');
  console.log('   • Normalize volume levels');
  console.log('   • Export as MP3, 192kbps');
  
  console.log('\n3. CREATE UI SOUNDS:');
  console.log('   • Download short notification sounds');
  console.log('   • Keep duration under 3 seconds');
  console.log('   • Export as WAV for best quality');
  console.log('   • Test volume levels in app');

  console.log('\n4. QUALITY ASSURANCE:');
  console.log('   • Test all files for seamless looping');
  console.log('   • Verify volume levels are consistent');
  console.log('   • Check file sizes (keep under 10MB each)');
  console.log('   • Test in actual app environment');

  console.log('\n\n✅ VALIDATION');
  console.log('==============');
  console.log('Run: npm run validate-audio-assets');
  console.log('This will check that all required files are present.\n');
}

// Check if audio directory exists and create structure
function createDirectoryStructure() {
  const audioDir = path.join(__dirname, '..', 'src', 'assets', 'audio');
  
  const dirs = [
    'binaural_beats/alpha',
    'binaural_beats/beta', 
    'binaural_beats/gamma',
    'binaural_beats/theta',
    'ambient_soundscapes/nature',
    'ambient_soundscapes/environments',
    'ui_sounds'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(audioDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

// Main execution
if (require.main === module) {
  createDirectoryStructure();
  generateAudioManifest();
}

module.exports = {
  AUDIO_SPECS,
  RESOURCES,
  generateAudioManifest,
  createDirectoryStructure
};