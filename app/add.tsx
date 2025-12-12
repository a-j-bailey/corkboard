import { apple } from '@react-native-ai/apple';
import { generateObject } from 'ai';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
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
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import EventPreviewModal from '../components/EventPreviewModal';
import { Event } from '../contexts/EventContext';

// Zod schema for event extraction (supports multiple events)
const eventSchema = z.object({
  events: z.array(
    z.object({
      title: z.string().describe('Event title'),
      date: z.string().describe('Event date in YYYY-MM-DD format or as written on poster'),
      time: z.string().optional().describe('Event time if available'),
      address: z.string().optional().describe('Event address or location'),
      cost: z.string().optional().describe('Event cost or price'),
      websiteUrl: z.string().optional().describe('Event website URL'),
      socialMediaHandles: z
        .object({
          twitter: z.string().optional(),
          instagram: z.string().optional(),
          facebook: z.string().optional(),
        })
        .optional()
        .describe('Social media handles if available'),
      description: z.string().optional().describe('Event description'),
      organizationName: z.string().optional().describe('Organization or host name'),
    })
  ),
});

type ExtractedEvents = z.infer<typeof eventSchema>;

export default function AddScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedEvent, setExtractedEvent] = useState<Partial<Event> | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Calculate camera window dimensions (rounded rectangle, ~2/3 of screen height)
  const cameraWindowHeight = height * 0.65;
  const cameraWindowWidth = width * 0.9; // 90% width with margins
  const borderRadius = 24; // Rounded corners


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

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  };

  const processImageWithAI = async (imageUri: string) => {
    // Check if Apple Intelligence is available
    if (!apple.isAvailable()) {
      Alert.alert(
        'Apple Intelligence Not Available',
        'Apple Intelligence is not available on this device. Please use a device with iOS 26+ and Apple Intelligence enabled.'
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Convert image to base64
      const base64Image = await convertImageToBase64(imageUri);

      // Extract event data using Apple Intelligence
      // Note: Type definitions may not fully support image input yet, but runtime should support it
      const result = await generateObject({
        model: apple(),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all event information from this poster including title, date, time, address, cost, website URL, social media handles, description, and organization name. If there are multiple events on the poster, extract all of them. Return as structured data.',
              },
              {
                type: 'image',
                image: base64Image,
              } as any, // Type assertion needed as types may not be fully updated for image support
            ],
          },
        ],
        schema: eventSchema,
      } as any);

      const extractedData = result.object as unknown as ExtractedEvents;

      if (extractedData.events && extractedData.events.length > 0) {
        // Use the first event (or we could show a picker if multiple)
        const firstEvent = extractedData.events[0];
        
        // Convert social media handles to the format expected by Event type
        const socialMediaHandles = firstEvent.socialMediaHandles
          ? {
              ...(firstEvent.socialMediaHandles.twitter && {
                twitter: firstEvent.socialMediaHandles.twitter,
              }),
              ...(firstEvent.socialMediaHandles.instagram && {
                instagram: firstEvent.socialMediaHandles.instagram,
              }),
              ...(firstEvent.socialMediaHandles.facebook && {
                facebook: firstEvent.socialMediaHandles.facebook,
              }),
            }
          : undefined;

        const eventData: Partial<Event> = {
          title: firstEvent.title,
          date: firstEvent.date,
          time: firstEvent.time,
          address: firstEvent.address,
          cost: firstEvent.cost,
          websiteUrl: firstEvent.websiteUrl,
          socialMediaHandles: socialMediaHandles,
          description: firstEvent.description,
          organizationName: firstEvent.organizationName,
        };

        setExtractedEvent(eventData);
        setShowPreviewModal(true);
      } else {
        Alert.alert('No Events Found', 'Could not extract event information from the image. Please try again with a clearer image.');
      }
    } catch (error) {
      console.error('Error processing image with AI:', error);
      Alert.alert(
        'Processing Error',
        'Failed to extract event information. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setCapturedImageUri(photo.uri);
        await processImageWithAI(photo.uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
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
        await processImageWithAI(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setExtractedEvent(null);
    setCapturedImageUri(null);
  };

  const handleSaveComplete = () => {
    handleClosePreview();
    router.back();
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
                setExtractedEvent(null);
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                Take Another
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        // Camera view with rounded window design
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          {/* Full screen camera view */}
          <CameraView 
            ref={cameraRef} 
            style={StyleSheet.absoluteFill} 
            facing={facing}
          />
          
          {/* Dark overlay with rounded camera window cutout */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Top dark area */}
            <View 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: insets.top + 80,
                backgroundColor: '#000000',
              }}
            />
            
            {/* Left dark area */}
            <View
              style={{
                position: 'absolute',
                top: insets.top + 80,
                left: 0,
                width: (width - cameraWindowWidth) / 2,
                height: cameraWindowHeight,
                backgroundColor: '#000000',
              }}
            />
            
            {/* Right dark area */}
            <View
              style={{
                position: 'absolute',
                top: insets.top + 80,
                right: 0,
                width: (width - cameraWindowWidth) / 2,
                height: cameraWindowHeight,
                backgroundColor: '#000000',
              }}
            />
            
            {/* Bottom dark area */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: height - (insets.top + 80 + cameraWindowHeight),
                backgroundColor: '#000000',
              }}
            />
            
            {/* White outline for camera window */}
            <View
              style={{
                position: 'absolute',
                top: insets.top + 80,
                left: (width - cameraWindowWidth) / 2,
                width: cameraWindowWidth,
                height: cameraWindowHeight,
                borderWidth: 1,
                borderColor: '#FFFFFF',
                borderRadius: borderRadius,
              }}
              pointerEvents="none"
            />
          </View>

          {/* Top status indicators */}
          <View 
            style={{
              position: 'absolute',
              top: insets.top + 20,
              left: 20,
              zIndex: 10,
            }}
            pointerEvents="none"
          >
            <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '600' }}>
              HEIF
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 2 }}>
              S1 02
            </Text>
          </View>

          {/* Green dot indicator (top right) */}
          <View
            style={{
              position: 'absolute',
              top: insets.top + 30,
              right: width / 2 - 20,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#00FF00',
              zIndex: 10,
            }}
            pointerEvents="none"
          />

          {/* Bottom controls */}
          <View 
            style={{
              position: 'absolute',
              bottom: insets.bottom + 30,
              left: 0,
              right: 0,
              alignItems: 'center',
              paddingHorizontal: 20,
            }}
          >
            {/* Yellow capture button */}
            <TouchableOpacity
              onPress={takePicture}
              disabled={isProcessing}
              style={{
                width: '100%',
                maxWidth: 180,
                height: 50,
                borderRadius: 25,
                backgroundColor: '#FFD700',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <Text style={{ color: '#000000', fontSize: 16, fontWeight: '600' }}>
                Capture
              </Text>
            </TouchableOpacity>

            {/* Zoom indicator */}
            <Text 
              style={{ 
                color: '#FFFFFF', 
                fontSize: 14, 
                marginTop: 20,
                marginLeft: 100,
              }}
            >
              1x
            </Text>
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

      {/* Preview Modal */}
      <EventPreviewModal
        visible={showPreviewModal}
        onClose={handleClosePreview}
        eventData={extractedEvent || {}}
        posterImageUri={capturedImageUri || undefined}
      />
    </View>
  );
}
