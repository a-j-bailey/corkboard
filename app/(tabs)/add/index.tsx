import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { GlassView } from 'expo-glass-effect';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../../../components/themed-text';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { extractEventFromImage } from '../../../services/visionExtraction';

export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const backgroundColor = Colors[colorScheme].background;
  const textColor = Colors[colorScheme].text;
  const tintColor = Colors[colorScheme].tint;
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const scanDocument = async () => {
    try {
      setIsProcessing(true);
      
      // Launch document scanner - limit to single page
      // Note: maxNumDocuments only works on Android. On iOS, users can scan multiple pages
      // but we will only use the first one.
      const response = await DocumentScanner.scanDocument({
        maxNumDocuments: 1, // Android only: limits UI to one page (requires app rebuild)
      });

      // Check if user cancelled
      if (response.status === 'cancel' || !response.scannedImages || response.scannedImages.length === 0) {
        setIsProcessing(false);
        return;
      }

      // Enforce single page: only use the first scanned image
      // On Android, maxNumDocuments: 1 should prevent multiple scans in the UI
      // On iOS, the scanner UI allows multiple scans, but we only use the first result
      const scannedImageUri = response.scannedImages[0];
      
      // Warn user if they scanned multiple pages (iOS only, or if Android limit didn't work)
      if (response.scannedImages.length > 1) {
        Alert.alert(
          'Multiple Pages Detected',
          'Please scan only one page at a time. Using the first page only.',
          [{ text: 'OK' }]
        );
      }
      
      if (scannedImageUri) {
        setCapturedImageUri(scannedImageUri);
        await processImage(scannedImageUri);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('[AddScreen] Error scanning document:', error);
      setIsProcessing(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check if user cancelled
      if (errorMessage.includes('cancel') || errorMessage.includes('Cancel') || errorMessage.includes('cancelled')) {
        // User cancelled, don't show error
        return;
      }
      
      Alert.alert('Error', 'Failed to scan document. Please try again.');
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

  const openPreviewForTesting = () => {
    // Temporary testing function - opens preview with empty data
    router.push({
      pathname: '/add/preview',
      params: {
        eventData: encodeURIComponent(JSON.stringify({})),
        posterImageUri: '',
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {/* Temporary Testing Button */}
      <TouchableOpacity
        onPress={openPreviewForTesting}
        style={{
          position: 'absolute',
          top: insets.top + 12,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: tintColor,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color={Colors[colorScheme].text} />
      </TouchableOpacity>

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
              <ThemedText style={{ marginTop: 16 }}>
                Extracting event information...
              </ThemedText>
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
                Scan Another
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        // Main screen with scan and library buttons
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor }}>
          {isProcessing && (
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <ThemedText style={{ marginTop: 16, fontSize: 16 }}>
                Scanning document...
              </ThemedText>
            </View>
          )}
          
          {!isProcessing && (
            <>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>
                Scan Event Poster
              </ThemedText>
              <ThemedText style={{ fontSize: 16, marginBottom: 48, textAlign: 'center' }}>
                Position the poster within the frame and the document scanner will automatically crop it
              </ThemedText>

              {/* Scan Document Button */}
              <TouchableOpacity
                onPress={scanDocument}
                disabled={isProcessing}
                activeOpacity={0.7}
                style={{ width: '100%', marginBottom: 16 }}
              >
                <GlassView
                  style={{
                    height: 64,
                    borderRadius: 32,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 32,
                    overflow: 'hidden',
                  }}
                  tintColor={tintColor}
                  glassEffectStyle="regular"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons
                      name="camera-outline"
                      size={28}
                      color={textColor}
                    />
                    <ThemedText
                      style={{
                        fontSize: 18,
                        fontWeight: '600',
                      }}
                    >
                      Scan Poster
                    </ThemedText>
                  </View>
                </GlassView>
              </TouchableOpacity>

              {/* Photo Library Button */}
              {/* <TouchableOpacity
                onPress={pickImage}
                disabled={isProcessing}
                activeOpacity={0.7}
                style={{ width: '100%' }}
              >
                <GlassView
                  style={{
                    height: 64,
                    borderRadius: 32,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 32,
                    overflow: 'hidden',
                  }}
                  glassEffectStyle="regular"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons
                      name="images-outline"
                      size={28}
                      color={textColor}
                    />
                    <ThemedText
                      style={{
                        fontSize: 18,
                        fontWeight: '600',
                      }}
                    >
                      Choose from Library
                    </ThemedText>
                  </View>
                </GlassView>
              </TouchableOpacity> */}
            </>
          )}
        </View>
      )}
    </View>
  );
}
