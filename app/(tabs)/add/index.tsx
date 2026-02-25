import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../../../components/themed-text';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { processPosterImage } from './processPosterImage';

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
    await processPosterImage(imageUri, router, {
      onComplete: () => {
        setTimeout(() => {
          setIsProcessing(false);
          setCapturedImageUri(null);
        }, 500);
      },
    });
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      {__DEV__ && (
        <TouchableOpacity
          onPress={openPreviewForTesting}
          style={{
            position: 'absolute',
            top: insets.top + 12,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={Colors[colorScheme].tint} />
        </TouchableOpacity>
      )}

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
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                Position the poster in the frame and tap the shutter to capture
              </ThemedText>

              {/* Scan Poster – opens camera screen */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/add/camera');
                }}
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
