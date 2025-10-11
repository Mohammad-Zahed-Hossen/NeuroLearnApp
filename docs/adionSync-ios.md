# iOS

To enable background audio on iOS (required for reliable playback when the app is backgrounded):

1. Open your Xcode project.
2. Select the project target → Capabilities.
3. Turn on "Background Modes" and check "Audio, AirPlay, and Picture in Picture".

Alternatively, you can add the key to Info.plist (XML snippet):

````xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>

## Testing

- Test on a physical device: start playback, lock the screen, and verify audio continues.
- Test switching away from the app and returning.

## Security & Privacy

- Continue to respect user privacy: ask for any permissions only if needed.
- Document background audio behavior in your app's privacy policy if you collect or transmit usage data.
1. Add permissions and service declaration to AndroidManifest.xml (inside the `<application>` element), for example:

```xml
<service android:name="com.some.player.TrackPlayerService" android:exported="false" />
````

2. Ensure your player library starts a foreground service when playing in background and supplies a persistent notification.

Notes:

- Android 8+ requires a foreground service for long-running background audio.
- If you plan to support lockscreen controls or media session integration, follow the track-player documentation.

## Testing

- Test on a physical device: start playback, lock the screen, and verify audio continues.
- Test switching away from the app and returning.

## Security & Privacy

- Continue to respect user privacy: ask for any permissions only if needed.
- Document background audio behavior in your app's privacy policy if you collect or transmit usage data.
