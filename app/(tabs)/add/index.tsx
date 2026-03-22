import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { ThemedText } from '../../../components/themed-text';
import { Colors } from '../../../constants/theme';
import { useEvents } from '../../../contexts/EventContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { ExtractionStepMessage } from '../../../services/extractionMessages';
import { processPosterImage } from './processPosterImage';

const POSTER_ASPECT_RATIO = 2 / 3; // width / height

/**
 * Map overlay frame rect (layout points from measureInWindow) to snapshot image pixels.
 * The camera preview can apply internal "cover" scaling/cropping when aspect ratios differ
 * between the sensor snapshot and the on-screen preview. We approximate that behavior by
 * mapping using a shared scale plus centered offsets.
 */
function frameRectToSnapshotCrop(
  frameRect: { x: number; y: number; width: number; height: number },
  snapshotWidth: number,
  snapshotHeight: number
): { originX: number; originY: number; width: number; height: number } {
  const { width: windowW, height: windowH } = Dimensions.get('window');

  // "cover" scale factor that makes the sensor snapshot fully cover the preview.
  // units: points-per-snapshot-pixel (because we divide view by snapshot dimensions).
  const scale = Math.max(windowW / snapshotWidth, windowH / snapshotHeight);

  const scaledSnapshotW = snapshotWidth * scale; // in points
  const scaledSnapshotH = snapshotHeight * scale; // in points

  // How much the scaled sensor extends beyond the preview, split equally on both sides.
  const offsetX = (scaledSnapshotW - windowW) / 2; // in points
  const offsetY = (scaledSnapshotH - windowH) / 2; // in points

  // Map view coordinates into snapshot pixel coordinates.
  let originX = Math.round((frameRect.x + offsetX) / scale);
  let originY = Math.round((frameRect.y + offsetY) / scale);
  let width = Math.round(frameRect.width / scale);
  let height = Math.round(frameRect.height / scale);

  originX = Math.max(0, originX);
  originY = Math.max(0, originY);
  width = Math.min(width, snapshotWidth - originX);
  height = Math.min(height, snapshotHeight - originY);
  width = Math.max(1, width);
  height = Math.max(1, height);

  if (__DEV__) {
    console.log('[CameraScreen] Crop mapping debug', {
      windowW,
      windowH,
      snapshotWidth,
      snapshotHeight,
      frameRect,
      scale,
      offsetX,
      offsetY,
      crop: { originX, originY, width, height },
    });
  }

  return { originX, originY, width, height };
}

export default function CameraScreen() {
  const router = useRouter();
  const { userLocation } = useEvents();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const cameraRef = useRef<Camera>(null);
  const frameRef = useRef<View>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatusLabel, setExtractionStatusLabel] = useState<string>(
    ExtractionStepMessage.extracting
  );
  const [capturedPosterUri, setCapturedPosterUri] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const flashOpacity = useRef(new Animated.Value(0)).current;
  const flashScale = useRef(new Animated.Value(1)).current;
  const posterOpacity = useRef(new Animated.Value(0)).current;
  const processingBackdropOpacity = useRef(new Animated.Value(0)).current;
  const borderRotation = useRef(new Animated.Value(0)).current;
  const pixelAnim = useRef(new Animated.Value(0)).current;

  const borderLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const pixelLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const { width: windowWidth } = Dimensions.get('window');

  const borderRotationDeg = borderRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pixelTranslateX = pixelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-windowWidth * 0.03, windowWidth * 0.03],
  });

  const pixelTranslateY = pixelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-windowWidth * 0.02, windowWidth * 0.02],
  });

  const pixelSquares = useMemo(() => {
    // Fixed set of "pixels" for a subtle animated noise effect.
    const squares: Array<{ x: number; y: number; size: number; o: number }> = [];
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < 90; i += 1) {
      squares.push({
        x: rand() * 100,
        y: rand() * 100,
        size: 2 + rand() * 3,
        o: 0.22 + rand() * 0.28,
      });
    }

    return squares;
  }, []);

  useEffect(() => {
    if (isExtracting && capturedPosterUri) {
      // Fade the camera into a clean backdrop + start rotating gradient border.
      processingBackdropOpacity.stopAnimation();
      borderLoopRef.current?.stop();
      pixelLoopRef.current?.stop();

      processingBackdropOpacity.setValue(0);
      Animated.timing(processingBackdropOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();

      borderRotation.setValue(0);
      borderLoopRef.current = Animated.loop(
        Animated.timing(borderRotation, {
          toValue: 1,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      borderLoopRef.current.start();

      pixelAnim.setValue(0);
      pixelLoopRef.current = Animated.loop(
        Animated.timing(pixelAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      pixelLoopRef.current.start();
    } else {
      borderLoopRef.current?.stop();
      borderLoopRef.current = null;
      pixelLoopRef.current?.stop();
      pixelLoopRef.current = null;

      Animated.timing(processingBackdropOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }

    return () => {
      borderLoopRef.current?.stop();
      borderLoopRef.current = null;
      pixelLoopRef.current?.stop();
      pixelLoopRef.current = null;
    };
  }, [
    capturedPosterUri,
    isExtracting,
    processingBackdropOpacity,
    borderRotation,
    pixelAnim,
  ]);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const resetExtractionUi = useCallback(() => {
    if (!isMountedRef.current) return;

    setIsExtracting(false);
    setIsCapturing(false);
    setCapturedPosterUri(null);
    setExtractionStatusLabel(ExtractionStepMessage.extracting);

    posterOpacity.setValue(0);
    flashOpacity.setValue(0);
    flashScale.setValue(1);
    processingBackdropOpacity.setValue(0);

    borderRotation.setValue(0);
    pixelAnim.setValue(0);

    borderLoopRef.current?.stop();
    borderLoopRef.current = null;
    pixelLoopRef.current?.stop();
    pixelLoopRef.current = null;
  }, [
    posterOpacity,
    flashOpacity,
    flashScale,
    processingBackdropOpacity,
    borderRotation,
    pixelAnim,
  ]);

  useFocusEffect(
    useCallback(() => {
      // Run when navigating away from this screen (screen remains mounted).
      return () => {
        resetExtractionUi();
      };
    }, [resetExtractionUi])
  );

  useEffect(() => {
    if (isFocused) return;

    // If this screen stays mounted while navigating (e.g., stack/tab transitions),
    // reset processing UI so it doesn't "stick" when you come back.
    resetExtractionUi();
  }, [
    isFocused,
    resetExtractionUi,
  ]);

  const handleCapture = async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCapturing(true);
    setIsExtracting(true);
    setExtractionStatusLabel(ExtractionStepMessage.extracting);

    // Immediate shutter flash.
    flashOpacity.setValue(1);
    flashScale.setValue(1.06);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 120,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    Animated.timing(flashScale, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

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
        quality: 75,
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
        {
          compress: 0.75,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      if (isMountedRef.current) {
        setCapturedPosterUri(uri);
        posterOpacity.setValue(0);
        Animated.timing(posterOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }

      await processPosterImage(uri, router, {
        userLocation,
        onProgress: setExtractionStatusLabel,
        onComplete: () => {
          if (!isMountedRef.current) return;

          Animated.timing(posterOpacity, {
            toValue: 0,
            duration: 160,
            easing: Easing.linear,
            useNativeDriver: true,
          }).start(() => {
            if (!isMountedRef.current) return;
            setCapturedPosterUri(null);
          });

          setIsExtracting(false);
          setIsCapturing(false);
        },
      });
    } catch (error) {
      console.error('[CameraScreen] Capture error:', error);

      if (isMountedRef.current) {
        setIsExtracting(false);
        setCapturedPosterUri(null);
        setExtractionStatusLabel(ExtractionStepMessage.extracting);
        posterOpacity.setValue(0);
        borderLoopRef.current?.stop();
        borderLoopRef.current = null;
        pixelLoopRef.current?.stop();
        pixelLoopRef.current = null;
      }
      setIsCapturing(false);
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
        style={[StyleSheet.absoluteFill, styles.cameraBase]}
        device={device}
        isActive={true}
        photo={true}
        video={true}
        onInitialized={() => setIsCameraReady(true)}
      />

      {/* Processing backdrop to fade the camera out */}
      <Animated.View
        pointerEvents="none"
        style={[styles.processingBackdrop, { opacity: processingBackdropOpacity }]}
      />

      {/* Full-screen shutter flash */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.flashOverlay,
          {
            opacity: flashOpacity,
            transform: [{ scale: flashScale }],
          },
        ]}
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
          style={[
            styles.posterFrame,
            {
              aspectRatio: POSTER_ASPECT_RATIO,
              borderColor: isExtracting ? 'transparent' : 'rgba(255,255,255,0.8)',
            },
          ]}
          collapsable={false}
        >
          {capturedPosterUri && isExtracting ? (
            <>
              <Animated.Image
                source={{ uri: capturedPosterUri }}
                style={[StyleSheet.absoluteFillObject, { opacity: posterOpacity }]}
                resizeMode="cover"
              />

              {/* Subtle "pixel" shimmer/noise */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pixelNoiseLayer,
                  {
                    opacity: posterOpacity,
                    transform: [
                      { translateX: pixelTranslateX },
                      { translateY: pixelTranslateY },
                    ],
                  },
                ]}
              >
                {pixelSquares.map((sq, idx) => (
                  <View
                    key={`px-${idx}`}
                    style={[
                      styles.pixelSquare,
                      {
                        left: `${sq.x}%`,
                        top: `${sq.y}%`,
                        width: sq.size,
                        height: sq.size,
                        opacity: sq.o,
                      },
                    ]}
                  />
                ))}
              </Animated.View>
            </>
          ) : null}
        </View>
      </View>

      {/* Bottom area: shutter button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        {isExtracting ? (
          <View>
            <ActivityIndicator size="small" color="#E5E7EB" />
            <ThemedText style={styles.shutterMessageText}>
              {extractionStatusLabel}
            </ThemedText>
          </View>
        ) : isCapturing ? (
          <ActivityIndicator size="small" color="#333" />
        ) : (
          <TouchableOpacity
            onPress={handleCapture}
            disabled={!isCameraReady || isCapturing}
            activeOpacity={0.8}
            style={[
              styles.shutterButton,
              (!isCameraReady || isCapturing) && styles.shutterButtonDisabled,
            ]}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraBase: {
    zIndex: 0,
    elevation: 0,
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
    zIndex: 200,
    elevation: 200,
  },
  posterFrame: {
    width: '80%',
    maxHeight: '75%',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
    elevation: 500,
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
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 1000,
    elevation: 1000,
  },
  processingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B1020',
    zIndex: 150,
    elevation: 150,
  },
  gradientBorderWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientBorderSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pixelNoiseLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pixelSquare: {
    position: 'absolute',
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  shutterMessageCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 6,
  },
  shutterMessageText: {
    marginTop: 6,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 12,
  },
});
