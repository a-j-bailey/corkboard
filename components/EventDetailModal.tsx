import { BottomSheet, Host } from '@expo/ui/swift-ui';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { Event } from '../contexts/EventContext';
import { useTheme } from '../contexts/ThemeContext';

interface EventDetailModalProps {
  visible: boolean;
  onClose: () => void;
  event: Event | null;
}

export default function EventDetailModal({
  visible,
  onClose,
  event,
}: EventDetailModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const textColor = Colors[colorScheme].text;
  const imageBgColor = colorScheme === 'dark' ? '#1F1F1F' : '#E5E7EB';
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  // Sync bottom sheet with visible prop
  useEffect(() => {
    setIsBottomSheetOpen(visible);
  }, [visible]);

  const handleBottomSheetClose = (isOpen: boolean) => {
    setIsBottomSheetOpen(isOpen);
    if (!isOpen) {
      onClose();
    }
  };

  // Calculate image dimensions for 2:3 aspect ratio
  const imagePadding = 20;
  const availableWidth = width - (imagePadding * 2);
  const imageWidth = availableWidth * 0.6; // 60% width
  const imageHeight = (imageWidth * 3) / 2; // 2:3 aspect ratio

  if (!event) {
    return null;
  }

  const renderContent = () => (
    <View
      style={{
        height: '100%',
      }}
    //   glassEffectStyle="regular"
    >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Poster Image - 2:3 aspect ratio, centered with padding */}
          {event.posterImage && (
            <View style={{
              paddingHorizontal: imagePadding,
              paddingTop: 20,
              paddingBottom: 24,
              alignItems: 'center',
            }}>
              <View style={{
                width: imageWidth,
                height: imageHeight,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: imageBgColor,
              }}>
                <Image
                  source={{ uri: event.posterImage }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              </View>
            </View>
          )}

          {/* Event Information */}
          <View style={{ paddingHorizontal: 20 }}>
            {/* Title */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                color: textColor,
                fontSize: 28,
                fontWeight: '700',
                textAlign: 'center',
                paddingVertical: 8,
              }}>
                {event.title || 'Event'}
              </Text>
            </View>

            {/* Date and Time */}
            {(event.date || event.time) && (
              <View style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                gap: 12,
                flexWrap: 'wrap',
              }}>
                {event.date && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={18} color={textColor} />
                    <Text style={{
                      color: textColor,
                      fontSize: 16,
                      fontWeight: '500',
                    }}>
                      {event.date}
                    </Text>
                  </View>
                )}
                {event.time && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="time-outline" size={18} color={textColor} />
                    <Text style={{
                      color: textColor,
                      fontSize: 16,
                      fontWeight: '500',
                    }}>
                      {event.time}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Location */}
            {event.address && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: 16,
                gap: 8,
              }}>
                <Ionicons name="location-outline" size={18} color={textColor} style={{ marginTop: 2 }} />
                <Text style={{
                  color: textColor,
                  fontSize: 16,
                  flex: 1,
                }}>
                  {event.address}
                </Text>
              </View>
            )}

            {/* Cost */}
            {event.cost && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16,
                gap: 8,
              }}>
                <Ionicons name="cash-outline" size={18} color={textColor} />
                <Text style={{
                  color: textColor,
                  fontSize: 16,
                  fontWeight: '500',
                }}>
                  {event.cost}
                </Text>
              </View>
            )}

            {/* Organization */}
            {event.organizationName && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16,
                gap: 8,
              }}>
                <Ionicons name="business-outline" size={18} color={textColor} />
                <Text style={{
                  color: textColor,
                  fontSize: 16,
                }}>
                  {event.organizationName}
                </Text>
              </View>
            )}

            {/* Description */}
            {event.description && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  color: textColor,
                  fontSize: 15,
                  lineHeight: 22,
                  textAlign: 'center',
                }}>
                  {event.description}
                </Text>
              </View>
            )}

            {/* Website URL */}
            {event.websiteUrl && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                gap: 8,
              }}>
                <Ionicons name="link-outline" size={18} color={textColor} />
                <Text style={{
                  color: '#3B82F6',
                  fontSize: 15,
                  textDecorationLine: 'underline',
                }}>
                  {event.websiteUrl}
                </Text>
              </View>
            )}

            {/* Social Media Handles */}
            {event.socialMediaHandles && (event.socialMediaHandles.twitter || event.socialMediaHandles.instagram || event.socialMediaHandles.facebook) && (
              <View style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 16,
                marginBottom: 20,
                flexWrap: 'wrap',
              }}>
                {event.socialMediaHandles.twitter && (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
                    <Text style={{
                      color: textColor,
                      fontSize: 12,
                    }}>
                      {event.socialMediaHandles.twitter}
                    </Text>
                  </View>
                )}
                {event.socialMediaHandles.instagram && (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                    <Text style={{
                      color: textColor,
                      fontSize: 12,
                    }}>
                      {event.socialMediaHandles.instagram}
                    </Text>
                  </View>
                )}
                {event.socialMediaHandles.facebook && (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                    <Text style={{
                      color: textColor,
                      fontSize: 12,
                    }}>
                      {event.socialMediaHandles.facebook}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
    </View>
  );

  if (!visible && !isBottomSheetOpen) {
    return null;
  }

  return (
    <Host style={{ position: 'absolute', width, height, zIndex: 1000, pointerEvents: 'box-none' }}>
      <BottomSheet
        isOpened={isBottomSheetOpen}
        onIsOpenedChange={handleBottomSheetClose}
      >
        {renderContent()}
      </BottomSheet>
    </Host>
  );
}

