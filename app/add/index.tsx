import { Ionicons } from '@expo/vector-icons';
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
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { extractEventFromImage } from '../../services/visionExtraction';

export default function AddScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(0); // 0 = no zoom, 1 = max zoom
  const [isNavigating, setIsNavigating] = useState(false);


  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
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

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleZoom = () => {
    // Toggle between 1x (0) and 2x (0.4, which approximates 2x on most devices)
    setZoom(current => (current === 0 ? 0.4 : 0));
  };

  const processImage = async (imageUri: string) => {
    console.log('[AddScreen] Starting image processing');
    console.log('[AddScreen] Image URI:', imageUri);
    setIsProcessing(true);

    let navigationCompleted = false;

    try {
      // Get xAI API key
      const xaiApiKey = Constants.expoConfig?.extra?.xaiApiKey || process.env.EXPO_PUBLIC_XAI_API_KEY;
      
      if (!xaiApiKey) {
        console.error('[AddScreen] No xAI API key found');
        console.error('[AddScreen] Checked Constants.expoConfig?.extra?.xaiApiKey:', Constants.expoConfig?.extra?.xaiApiKey);
        console.error('[AddScreen] Checked process.env.EXPO_PUBLIC_XAI_API_KEY:', process.env.EXPO_PUBLIC_XAI_API_KEY ? '***' : 'undefined');
        Alert.alert(
          'API Key Required',
          'xAI API key is required. Please set EXPO_PUBLIC_XAI_API_KEY in your environment or add xaiApiKey to app.json extra config.'
        );
        setIsProcessing(false);
        return;
      }

      console.log('[AddScreen] xAI API key found, length:', xaiApiKey.length);
      console.log('[AddScreen] Attempting vision-based extraction with xAI Grok...');
      
      const eventData = await extractEventFromImage(imageUri, xaiApiKey);
      
      console.log('[AddScreen] Vision extraction successful');
      console.log('[AddScreen] Extracted event data:', JSON.stringify(eventData, null, 2));
      
      // Store image URI for navigation before clearing state
      const imageUriForPreview = capturedImageUri || imageUri;
      
      // Navigate to preview screen with event data and image URI
      console.log('[AddScreen] Navigating to preview screen with extracted data');
      console.log('[AddScreen] Event data being passed:', JSON.stringify(eventData, null, 2));
      console.log('[AddScreen] Poster image URI:', imageUriForPreview);
      
      // Navigate immediately to preview screen (before any state changes)
      router.push({
        pathname: '/add/preview',
        params: {
          eventData: encodeURIComponent(JSON.stringify(eventData)),
          posterImageUri: imageUriForPreview || '',
        },
      });
      
      navigationCompleted = true;
      console.log('[AddScreen] Image processing completed successfully - redirected to preview');
      
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
            console.log('[AddScreen] User chose to try again');
            setCapturedImageUri(null);
            setIsProcessing(false);
          },
        },
        {
          text: 'Enter Manually',
          onPress: () => {
            console.log('[AddScreen] User chose to enter manually');
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
        console.log('[AddScreen] Processing state reset');
      }
    }
  };

  const takePicture = async () => {
    console.log('[AddScreen] Taking picture...');
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
        console.log('[AddScreen] Picture captured successfully:', photo.uri);
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
    console.log('[AddScreen] Picking image from library...');
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

      console.log('[AddScreen] Opening image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('[AddScreen] Image selected:', imageUri);
        setCapturedImageUri(imageUri);
        await processImage(imageUri);
      } else {
        console.log('[AddScreen] Image picker canceled');
      }
    } catch (error) {
      console.error('[AddScreen] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const navigateToPreviewWithDummyDataFromButton = () => {
    // Prevent multiple navigations
    if (isNavigating || isProcessing) {
      console.log('[AddScreen] Navigation already in progress, ignoring duplicate call');
      return;
    }

    setIsNavigating(true);
    console.log('[AddScreen] Test data button pressed - navigating to preview');
    
    const dummyEventData = {
      title: 'Summer Music Festival 2024',
      date: '2024-07-15',
      time: '6:00 PM',
      address: 'Central Park, New York, NY',
      cost: '$45',
      websiteUrl: 'https://example.com/festival',
      description: 'Join us for an amazing summer music festival featuring top artists and local bands. Food trucks, drinks, and great vibes!',
      organizationName: 'City Events Co.',
      socialMediaHandles: {
        twitter: '@summerfest2024',
        instagram: '@summerfest2024',
        facebook: 'Summer Music Festival',
      },
    };

    const encodedEventData = encodeURIComponent(JSON.stringify(dummyEventData));
    
    router.push({
      pathname: '/add/preview',
      params: {
        eventData: encodedEventData,
        posterImageUri: '',
      },
    });
    
    console.log('[AddScreen] Navigation to preview called');
    
    // Reset navigation flag after a delay to allow navigation to complete
    setTimeout(() => {
      setIsNavigating(false);
    }, 1000);
  };

  const navigateToPreviewWithDummyData = () => {
    // Prevent multiple navigations
    if (isNavigating || isProcessing) {
      console.log('[AddScreen] Navigation already in progress, ignoring duplicate call');
      return;
    }

    setIsNavigating(true);
    console.log('[AddScreen] Preview with dummy data button pressed');
    
    const dummyEventData = {
      title: 'Summer Music Festival 2024',
      date: '2024-07-15',
      time: '6:00 PM',
      address: 'Central Park, New York, NY',
      cost: '$45',
      websiteUrl: 'https://example.com/festival',
      description: 'Join us for an amazing summer music festival featuring top artists and local bands. Food trucks, drinks, and great vibes!',
      organizationName: 'City Events Co.',
      socialMediaHandles: {
        twitter: '@summerfest2024',
        instagram: '@summerfest2024',
        facebook: 'Summer Music Festival',
      },
    };

    console.log('[AddScreen] Navigating to preview with dummy data');
    console.log('[AddScreen] Dummy event data:', JSON.stringify(dummyEventData, null, 2));
    
    const encodedEventData = encodeURIComponent(JSON.stringify(dummyEventData));
    console.log('[AddScreen] Encoded event data length:', encodedEventData.length);
    
    router.push({
      pathname: '/add/preview',
      params: {
        eventData: encodedEventData,
        posterImageUri: '',
      },
    });
    
    console.log('[AddScreen] Navigation to preview called');
    
    // Reset navigation flag after a delay to allow navigation to complete
    setTimeout(() => {
      setIsNavigating(false);
    }, 1000);
  };


  return (
    <View style={{ flex: 1 }}>
      {capturedImageUri ? (
        // Show captured/selected image
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
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
              <Text style={{ color: '#666', marginTop: 16 }}>
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
        // Full screen camera view
        <View style={{ flex: 1 }}>
          <CameraView 
            ref={cameraRef} 
            style={StyleSheet.absoluteFill} 
            facing={facing}
            zoom={zoom}
          />
          
          {/* Dummy Data Button - Top Right */}
          <View
            style={{
              position: 'absolute',
              top: insets.top + 20,
              right: 20,
              zIndex: 1000,
              elevation: 10,
            }}
          >
            <TouchableOpacity
              onPress={navigateToPreviewWithDummyDataFromButton}
              disabled={isProcessing || isNavigating}
              activeOpacity={0.7}
            >
              <GlassView
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                glassEffectStyle="regular"
                isInteractive
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                  Test Data
                </Text>
              </GlassView>
            </TouchableOpacity>
          </View>
          
          {/* Glass toolbar - positioned above nav bar */}
          <View 
            style={{
              position: 'absolute',
              bottom: insets.bottom * 3 ,
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
                }}
                glassEffectStyle="regular"
                isInteractive
              >
                <Ionicons name="images-outline" size={24} color="#FFFFFF" />
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
                }}
                glassEffectStyle="regular"
                isInteractive
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                  Capture
                </Text>
              </GlassView>
            </TouchableOpacity>

            {/* Zoom Button */}
            <TouchableOpacity
              onPress={handleZoom}
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
                }}
                glassEffectStyle="regular"
                isInteractive
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                  {zoom === 0 ? '1x' : '2x'}
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
