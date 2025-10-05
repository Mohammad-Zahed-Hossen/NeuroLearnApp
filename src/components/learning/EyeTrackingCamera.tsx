import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
// The vision camera and reanimated frame processor are optional native
// dependencies. Import them dynamically to avoid build-time type errors when
// the packages are not installed in the environment used for quick checks.
let Camera: any = null;
let useCameraDevices: any = null;
let useFrameProcessor: any = null;
let runOnJS: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const vision = require('react-native-vision-camera');
  Camera = vision.Camera;
  useCameraDevices = vision.useCameraDevices;
  // frame processor helper (may be exported separately)
  useFrameProcessor = vision.useFrameProcessor || (() => null);
} catch (e) {
  // vision camera not available in this environment
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  runOnJS = require('react-native-reanimated').runOnJS;
} catch (e) {
  runOnJS = (fn: any) => fn;
}
import { eyeTrackingService } from '../../services/learning/EyeTrackingService';

interface EyeTrackingCameraProps {
  isActive: boolean;
  onMetricsUpdate?: (metrics: any) => void;
}

export const EyeTrackingCamera: React.FC<EyeTrackingCameraProps> = ({
  isActive,
  onMetricsUpdate,
}) => {
  const cameraRef = useRef<any | null>(null);
  const devices = useCameraDevices();
  const device = devices.front;
  const [initialized, setInitialized] = useState(false);

  const frameProcessor = useFrameProcessor
    ? useFrameProcessor((frame: any) => {
        'worklet';
        // In production this would perform ML frame processing and call runOnJS
        runOnJS(simulateFrameProcessing)();
      }, [])
    : null;

  const simulateFrameProcessing = () => {
    // Simulate blink occasionally
    if (Math.random() < 0.01) {
      eyeTrackingService.detectBlink();
    }
    const metrics = eyeTrackingService.getMetrics();
    onMetricsUpdate?.(metrics);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const ok = await eyeTrackingService.initialize();
        if (ok) setInitialized(true);
      } catch (e) {
        console.warn('EyeTrackingCamera init failed', e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isActive) {
      eyeTrackingService.startTracking();
    } else {
      eyeTrackingService.stopTracking();
    }
  }, [isActive]);

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Front camera not available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isActive && initialized && (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isActive}
          frameProcessor={frameProcessor}
          frameProcessorFps={5}
        />
      )}
      <View style={styles.metricsOverlay}>
        <Text style={styles.metricsText}>
          👁️ Eye Tracking: {isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  permissionContainer: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  permissionText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
  metricsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 4,
    borderRadius: 6,
  },
  metricsText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
});

export default EyeTrackingCamera;
