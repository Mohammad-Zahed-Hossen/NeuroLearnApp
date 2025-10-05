// Lightweight loader that returns an expo-av Sound instance for a bundled asset.
// Uses a lazy require for expo-av to avoid top-level native module resolution issues in non-Expo environments.

export async function loadAudioFile(filename: string) {
  try {
    // Lazy-require expo-av so this file can be imported in environments without expo-av installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Audio } = require('expo-av');

    // Resolve the bundled asset module. Using a static require pattern is ideal for bundlers.
    // We attempt the standard assets path: src/assets/audio/<filename>
    let assetModule: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      assetModule = require(`../assets/audio/${filename}`);
    } catch (err) {
      throw new Error(
        `Failed to resolve bundled audio asset: ${filename}. Make sure the file exists at src/assets/audio/${filename}`,
      );
    }

    // Create and load the Sound instance from the bundled module
    const { sound } = await Audio.Sound.createAsync(assetModule, {
      shouldPlay: false,
      isLooping: true,
    });

    return sound;
  } catch (error) {
    // Surface a clear error to help debugging during development
    throw new Error(`expo-audio loader failed for ${filename}: ${error}`);
  }
}
