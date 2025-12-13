import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import { GlassView } from 'expo-glass-effect';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { extractEventFromImage } from '../../services/visionExtraction';

export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { colorScheme } = useTheme();
  const backgroundColor = Colors[colorScheme].background;
  const textColor = Colors[colorScheme].text;
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<1 | 2>(1); // 1x or 2x zoom

  if (!permission) {
    // Camera permissions are still loading
    return <View style={{ flex: 1, backgroundColor }} />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor }}>
        <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 16, color: textColor }}>
          We need your permission to use the camera
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#3B82F6',
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 8,
          }}
          onPress={requestPermission}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            Grant Permission
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleZoom = () => {
    setZoomLevel(current => (current === 1 ? 2 : 1));
  };

  // Convert zoom level to zoom value (0-1 range)
  // 1x = 0, 2x = 0.33 (typical value that triggers 2x on most devices)
  const zoomValue = zoomLevel === 1 ? 0 : 0.33;

  const processImage = async (imageUri: string) => {
    setIsProcessing(true);

    let navigationCompleted = false;

    try {
      // Get xAI API key
      const xaiApiKey = Constants.expoConfig?.extra?.xaiApiKey || process.env.EXPO_PUBLIC_XAI_API_KEY;

      if (!xaiApiKey) {
        console.error('[AddScreen] No xAI API key found');
        Alert.alert(
          'API Key Required',
          'xAI API key is required. Please set EXPO_PUBLIC_XAI_API_KEY in your environment or add xaiApiKey to app.json extra config.'
        );
        setIsProcessing(false);
        return;
      }

      const eventData = await extractEventFromImage(imageUri, xaiApiKey);

      // Store image URI for navigation before clearing state
      const imageUriForPreview = capturedImageUri || imageUri;

      // Navigate immediately to preview screen (before any state changes)
      router.push({
        pathname: '/add/preview',
        params: {
          eventData: encodeURIComponent(JSON.stringify(eventData)),
          posterImageUri: imageUriForPreview || '',
        },
      });

      navigationCompleted = true;

      // Reset processing state and clear captured image after navigation is initiated
      // Use setTimeout to ensure navigation completes before state changes
      setTimeout(() => {
        setIsProcessing(false);
        setCapturedImageUri(null);
      }, 500);

      return; // Exit early to prevent finally block from resetting state
    } catch (error) {
      console.error('[AddScreen] Error processing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Provide more specific error messages based on error type
      let userMessage = 'Failed to extract event information. ';
      if (errorMessage.includes('No text detected') || errorMessage.includes('No text content')) {
        userMessage = 'No text was detected in the image. Please ensure the image is clear and contains readable text. ';
      } else if (errorMessage.includes('Text extraction failed')) {
        userMessage = 'Text extraction failed. The image may be too blurry or low quality. ';
      }
      userMessage += 'You can still manually enter the details in the preview screen.';

      Alert.alert('Processing Error', userMessage, [
        {
          text: 'Try Again',
          onPress: () => {
            setCapturedImageUri(null);
            setIsProcessing(false);
          },
        },
        {
          text: 'Enter Manually',
          onPress: () => {
            // Navigate to preview screen with empty event data so user can enter manually
            router.push({
              pathname: '/add/preview',
              params: {
                eventData: encodeURIComponent(JSON.stringify({})),
                posterImageUri: capturedImageUri || '',
              },
            });
            setIsProcessing(false);
          },
        },
      ]);
    } finally {
      // Only reset processing state if navigation didn't complete
      // (navigation will handle state cleanup in success case)
      if (!navigationCompleted) {
        setIsProcessing(false);
      }
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) {
      console.warn('[AddScreen] Camera ref not available');
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setCapturedImageUri(photo.uri);
        await processImage(photo.uri);
      } else {
        console.warn('[AddScreen] Picture captured but no URI returned');
      }
    } catch (error) {
      console.error('[AddScreen] Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[AddScreen] Media library permission not granted');
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to select an image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setCapturedImageUri(imageUri);
        await processImage(imageUri);
      }
    } catch (error) {
      console.error('[AddScreen] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {capturedImageUri ? (
        // Show captured/selected image
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor }}>
          <View style={{ width: '100%', height: 400, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            <Image
              source={{ uri: capturedImageUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
          {isProcessing && (
            <View style={{ alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={{ color: colorScheme === 'dark' ? '#9BA1A6' : '#666', marginTop: 16 }}>
                Extracting event information...
              </Text>
            </View>
          )}
          {!isProcessing && (
            <TouchableOpacity
              style={{
                backgroundColor: '#3B82F6',
                paddingHorizontal: 32,
                paddingVertical: 16,
                borderRadius: 8,
              }}
              onPress={() => {
                setCapturedImageUri(null);
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                Take Another
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        // Full screen camera view - only render when screen is focused
        <View style={{ flex: 1 }}>
          {isFocused && (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              zoom={zoomValue}
            />
          )}

          {/* Glass toolbar - positioned above nav bar */}
          <View
            style={{
              position: 'absolute',
              bottom: insets.bottom * 3,
              left: 20,
              right: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            {/* Photo Library Button */}
            <TouchableOpacity
              onPress={pickImage}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <GlassView
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
                glassEffectStyle="regular"
                isInteractive
              >
                {/* Semi-transparent dark overlay for consistent contrast */}
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 28,
                  }}
                />
                <Ionicons
                  name="images-outline"
                  size={24}
                  color="#FFFFFF"
                  style={{
                    textShadowColor: 'rgba(0, 0, 0, 0.75)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                />
              </GlassView>
            </TouchableOpacity>

            {/* Wide Capture Button */}
            <TouchableOpacity
              onPress={takePicture}
              disabled={isProcessing}
              activeOpacity={0.7}
              style={{ flex: 1, maxWidth: 200 }}
            >
              <GlassView
                style={{
                  height: 56,
                  borderRadius: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 24,
                  overflow: 'hidden',
                }}
                glassEffectStyle="regular"
                isInteractive
              >
                {/* Semi-transparent dark overlay for consistent contrast */}
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 28,
                  }}
                />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: '600',
                    textShadowColor: 'rgba(0, 0, 0, 0.75)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                >
                  Capture
                </Text>
              </GlassView>
            </TouchableOpacity>

            {/* Zoom Toggle Button */}
            <TouchableOpacity
              onPress={toggleZoom}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <GlassView
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
                glassEffectStyle="regular"
                isInteractive
              >
                {/* Semi-transparent dark overlay for consistent contrast */}
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 28,
                  }}
                />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '600',
                    textShadowColor: 'rgba(0, 0, 0, 0.75)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                >
                  {zoomLevel}x
                </Text>
              </GlassView>
            </TouchableOpacity>
          </View>

          {/* Processing overlay */}
          {isProcessing && (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }
              ]}
            >
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 16 }}>
                Processing image...
              </Text>
            </View>
          )}
        </View>
      )}

    </View>
  );
}
