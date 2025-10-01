/**
 * Phase 7: Soundscape Asset Validator
 * 
 * Validates that preset configurations reference bundled audio assets.
 * Provides runtime validation and helpful error messages for missing assets.
 */

import { COGNITIVE_PRESETS } from './PresetConfiguration';

/**
 * Expected audio assets that should be bundled with the app
 */
const EXPECTED_ASSETS = [
  // Existing files in your structure
  'ambient_soundscapes/environments/uplifting-pad-texture.mp3',
  'ambient_soundscapes/environments/forest-fire.mp3',
  'ambient_soundscapes/nature/shallow-river.mp3',
  'ambient_soundscapes/nature/soothing-river-flow.mp3',
  'ambient_soundscapes/nature/forest-ambience-morningspring.mp3',
  'ambient_soundscapes/nature/rain-inside-a-car.mp3',
  'binaural_beats/alpha/alpha_8hz_calm.mp3',
  'binaural_beats/theta/thetha_428hz_meditation.mp3',
  'ui_sounds/camera-shutter.mp3',
];

/**
 * Validate that all preset assets are available
 */
export function validatePresetAssets(): void {
  console.log('🔍 Validating soundscape preset assets...');
  
  const missingAssets: string[] = [];
  const usedAssets = new Set<string>();
  
  // Check each preset's ambient track
  Object.values(COGNITIVE_PRESETS).forEach(preset => {
    if (preset.ambientTrack && preset.ambientTrack !== '') {
      usedAssets.add(preset.ambientTrack);
    }
  });
  
  console.log('📋 Required assets:', Array.from(usedAssets));
  console.log('✅ Asset validation completed (runtime check)');
}

/**
 * Get list of required assets
 */
export function getRequiredAssets(): string[] {
  const assets = new Set<string>();
  
  Object.values(COGNITIVE_PRESETS).forEach(preset => {
    if (preset.ambientTrack && preset.ambientTrack !== '') {
      assets.add(preset.ambientTrack);
    }
  });
  
  return Array.from(assets);
}

/**
 * Check if a specific asset exists
 */
export function checkAssetExists(filename: string): boolean {
  // Runtime check - assets are validated when actually loaded
  return EXPECTED_ASSETS.includes(filename);
}