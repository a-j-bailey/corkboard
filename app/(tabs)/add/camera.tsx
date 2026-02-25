import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../../../components/themed-text';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { processPosterImage } from './processPosterImage';

const POSTER_ASPECT_RATIO = 2 / 3; // width / height

/**
 * Map overlay frame rect (layout points from measureInWindow) to snapshot image pixels.
 * Snapshot is a screenshot of the preview, so we scale from window size to snapshot size.
 */
function frameRectToSnapshotCrop(
  frameRect: { x: number; y: number; width: number; height: number },
  snapshotWidth: number,
  snapshotHeight: number
): { originX: number; originY: number; width: number; height: number } {
  const { width: windowW, height: windowH } = Dimensions.get('window');
  const scaleX = snapshotWidth / windowW;
  const scaleY = snapshotHeight / windowH;

  let originX = Math.round(frameRect.x * scaleX);
  let originY = Math.round(frameRect.y * scaleY);
  let width = Math.round(frameRect.width * scaleX);
  let height = Math.round(frameRect.height * scaleY);

  originX = Math.max(0, originX);
  originY = Math.max(0, originY);
  width = Math.min(width, snapshotWidth - originX);
  height = Math.min(height, snapshotHeight - originY);
  width = Math.max(1, width);
  height = Math.max(1, height);

  return { originX, originY, width, height };
}

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const cameraRef = useRef<Camera>(null);
  const frameRef = useRef<View>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const handleCapture = async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCapturing(true);

    try {
      const frameRect = await new Promise<{
        x: number;
        y: number;
        width: number;
        height: number;
      }>((resolve) => {
        frameRef.current?.measureInWindow((x, y, width, height) => {
          resolve({ x, y, width, height });
        });
      });

      const snapshot = await cameraRef.current.takeSnapshot({
        quality: 90,
      });
      const rawUri = snapshot.path.startsWith('file://')
        ? snapshot.path
        : `file://${snapshot.path}`;

      const crop = frameRectToSnapshotCrop(
        frameRect,
        snapshot.width,
        snapshot.height
      );
      const { uri } = await ImageManipulator.manipulateAsync(
        rawUri,
        [{ crop }],
        {}
      );

      await processPosterImage(uri, router, {
        onComplete: () => setIsCapturing(false),
      });
    } catch (error) {
      console.error('[CameraScreen] Capture error:', error);
      setIsCapturing(false);
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (!message.toLowerCase().includes('cancel')) {
        Alert.alert('Capture Error', 'Failed to take photo. Please try again.');
      }
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (!hasPermission) {
    return (
      <View style={[styles.centered, { backgroundColor: Colors[colorScheme].background }]}>
        <ThemedText style={styles.permissionTitle}>Camera access needed</ThemedText>
        <ThemedText style={[styles.permissionText, { color: Colors[colorScheme].text }]}>
          Allow camera access to scan event posters.
        </ThemedText>
        <TouchableOpacity
          onPress={requestPermission}
          style={[styles.permissionButton, { backgroundColor: Colors[colorScheme].tint }]}
        >
          <ThemedText style={styles.permissionButtonText}>Grant access</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors[colorScheme].tint} />
          <ThemedText style={{ color: Colors[colorScheme].tint, fontSize: 17 }}>Back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={[styles.centered, { backgroundColor: Colors[colorScheme].background }]}>
        <ThemedText style={styles.noDeviceText}>No camera device found</ThemedText>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors[colorScheme].tint} />
          <ThemedText style={{ color: Colors[colorScheme].tint, fontSize: 17 }}>Back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        video={true}
        onInitialized={() => setIsCameraReady(true)}
      />

      {/* Back button */}
      <TouchableOpacity
        onPress={handleBack}
        style={[styles.backButtonOverlay, { top: insets.top + 12 }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="chevron-back" size={32} color="#fff" />
      </TouchableOpacity>

      {/* 2:3 poster frame overlay (measured for crop) */}
      <View style={styles.overlayContainer} pointerEvents="none">
        <View
          ref={frameRef}
          style={[styles.posterFrame, { aspectRatio: POSTER_ASPECT_RATIO }]}
          collapsable={false}
        />
      </View>

      {/* Bottom area: shutter button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          onPress={handleCapture}
          disabled={!isCameraReady || isCapturing}
          activeOpacity={0.8}
          style={[
            styles.shutterButton,
            (!isCameraReady || isCapturing) && styles.shutterButtonDisabled,
          ]}
        >
          {isCapturing ? (
            <ActivityIndicator size="small" color="#333" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 32,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonOverlay: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  noDeviceText: {
    fontSize: 18,
    marginBottom: 24,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterFrame: {
    width: '80%',
    maxHeight: '75%',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  shutterButtonDisabled: {
    opacity: 0.6,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
});
