import { BottomSheet, Host } from '@expo/ui/swift-ui';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { Event } from '../contexts/EventContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatDateOnly, formatEventDates, formatTime } from '../utils/dateFormatter';
import { XSymbol } from './XSymbol';

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

  const handleOpenURL = async (url: string) => {
    try {
      // Ensure URL has protocol
      let formattedUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        formattedUrl = `https://${url}`;
      }
      await WebBrowser.openBrowserAsync(formattedUrl);
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const handleOpenLocation = async () => {
    if (!event) return;

    try {
      let mapsUrl: string;
      
      if (event.latitude && event.longitude) {
        // Use coordinates if available
        mapsUrl = `maps://maps.apple.com/?q=${event.latitude},${event.longitude}`;
      } else if (event.address) {
        // Use address if coordinates not available
        const encodedAddress = encodeURIComponent(event.address);
        mapsUrl = `maps://maps.apple.com/?q=${encodedAddress}`;
      } else {
        return;
      }

      const canOpen = await Linking.canOpenURL(mapsUrl);
      if (canOpen) {
        await Linking.openURL(mapsUrl);
      } else {
        // Fallback to web maps
        const webMapsUrl = event.latitude && event.longitude
          ? `https://maps.apple.com/?q=${event.latitude},${event.longitude}`
          : `https://maps.apple.com/?q=${encodeURIComponent(event.address || '')}`;
        await WebBrowser.openBrowserAsync(webMapsUrl);
      }
    } catch (error) {
      console.error('Error opening location in maps:', error);
    }
  };

  const getXURL = (handle: string): string => {
    if (handle.startsWith('http://') || handle.startsWith('https://')) {
      return handle;
    }
    const username = handle.startsWith('@') ? handle.slice(1) : handle;
    return `https://twitter.com/${username}`;
  };

  const getInstagramURL = (handle: string): string => {
    if (handle.startsWith('http://') || handle.startsWith('https://')) {
      return handle;
    }
    const username = handle.startsWith('@') ? handle.slice(1) : handle;
    return `https://instagram.com/${username}`;
  };

  const getFacebookURL = (handle: string): string => {
    if (handle.startsWith('http://') || handle.startsWith('https://')) {
      return handle;
    }
    return `https://facebook.com/${handle}`;
  };

  // Calculate image dimensions for 2:3 aspect ratio
  const imagePadding = 20;
  const availableWidth = width - (imagePadding * 2);
  const imageWidth = availableWidth * 0.6; // 60% width
  const imageHeight = (imageWidth * 3) / 2; // 2:3 aspect ratio

  if (!event) {
    return null;
  }

  console.log('event', event);

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
          <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
            {/* Title */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{
                color: textColor,
                fontSize: 36,
                fontWeight: '700',
                textAlign: 'center',
                paddingVertical: 8,
              }}>
                {event.title || 'Event'}
              </Text>
            </View>

            {/* Single Date - Show under title */}
            {event.dates && event.dates.length === 1 && (
              <View style={{
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Text style={{
                  color: textColor,
                  fontSize: 18,
                  fontWeight: '500',
                  textAlign: 'center',
                }}>
                  {formatEventDates(event.dates)}
                </Text>
              </View>
            )}

            {/* Location - Centered, Clickable */}
            {(event.address || event.locationName) && (
              <TouchableOpacity
                onPress={handleOpenLocation}
                activeOpacity={0.7}
                style={{
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text style={{
                  color: '#3B82F6',
                  fontSize: 18,
                  fontWeight: '400',
                  textAlign: 'center',
                  textDecorationLine: 'underline',
                }}>
                  {event.locationName || event.address}
                </Text>
                {event.address && event.locationName && event.address !== event.locationName && (
                  <Text style={{
                    color: textColor,
                    fontSize: 14,
                    fontWeight: '300',
                    textAlign: 'center',
                    marginTop: 4,
                    opacity: 0.7,
                  }}>
                    {event.address}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Price - Centered */}
            {event.price !== null && event.price !== undefined && (
              <View style={{
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <Text style={{
                  color: textColor,
                  fontSize: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                }}>
                  {event.price === 0 ? 'Free' : `$${event.price}`}
                </Text>
              </View>
            )}
            {event.price === null && (
              <View style={{
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <Text style={{
                  color: textColor,
                  fontSize: 18,
                  fontWeight: '400',
                  textAlign: 'center',
                  opacity: 0.7,
                }}>
                  Price TBD
                </Text>
              </View>
            )}
          </View>

          {/* Multiple Dates Card - Show above details if more than one date */}
          {event.dates && event.dates.length > 1 && (
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
              <GlassView
                style={{
                  borderRadius: 20,
                  padding: 20,
                  overflow: 'hidden',
                }}
                glassEffectStyle="regular"
              >
                <Text style={{
                  color: textColor,
                  fontSize: 14,
                  fontWeight: '600',
                  marginBottom: 12,
                  opacity: 0.7,
                }}>
                  Event Dates
                </Text>
                <View style={{ gap: 8 }}>
                  {event.dates.map((date, index) => {
                    const dateObj = new Date(date.start);
                    const isDateOnly = dateObj.getUTCHours() === 0 && dateObj.getUTCMinutes() === 0;
                    
                    return (
                      <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{
                          color: textColor,
                          fontSize: 16,
                          fontWeight: '500',
                          flex: 1,
                        }}>
                          {formatDateOnly(dateObj)}
                        </Text>
                        {!isDateOnly && (
                          <Text style={{
                            color: textColor,
                            fontSize: 14,
                            opacity: 0.7,
                          }}>
                            {formatTime(dateObj)}
                            {date.end && ` - ${formatTime(new Date(date.end))}`}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </GlassView>
            </View>
          )}

          {/* Content cards */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
            {/* Host/Description Card */}
            {(event.organizationName || event.description) && (
              <GlassView
                style={{
                  borderRadius: 20,
                  padding: 20,
                  overflow: 'hidden',
                }}
                glassEffectStyle="regular"
              >
                {event.organizationName && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{
                      color: textColor,
                      fontSize: 14,
                      fontWeight: '600',
                      marginBottom: 4,
                      opacity: 0.7,
                    }}>
                      Hosted by
                    </Text>
                    <Text style={{
                      color: textColor,
                      fontSize: 18,
                      fontWeight: '600',
                    }}>
                      {event.organizationName}
                    </Text>
                  </View>
                )}
                {event.description && (
                  <Text style={{
                    color: textColor,
                    fontSize: 15,
                    lineHeight: 22,
                  }}>
                    {event.description}
                  </Text>
                )}
              </GlassView>
            )}

            {/* Additional Details Card */}
            {(event.websiteUrl || (event.socialMediaHandles && (event.socialMediaHandles.x || event.socialMediaHandles.instagram || event.socialMediaHandles.facebook))) && (
              <GlassView
                style={{
                  borderRadius: 20,
                  padding: 20,
                  overflow: 'hidden',
                }}
                glassEffectStyle="regular"
              >
                <Text style={{
                  color: textColor,
                  fontSize: 14,
                  fontWeight: '600',
                  marginBottom: 16,
                  opacity: 0.7,
                }}>
                  Additional Details
                </Text>
                <View style={{ gap: 16 }}>
                  {event.websiteUrl && (
                    <TouchableOpacity
                      onPress={() => handleOpenURL(event.websiteUrl!)}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                      <Ionicons name="link-outline" size={20} color={textColor} style={{ opacity: 0.7 }} />
                      <Text style={{
                        color: '#3B82F6',
                        fontSize: 16,
                        flex: 1,
                        textDecorationLine: 'underline',
                      }}>
                        {event.websiteUrl}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {event.socialMediaHandles && (event.socialMediaHandles.x || event.socialMediaHandles.instagram || event.socialMediaHandles.facebook) && (
                    <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                      {event.socialMediaHandles.x && (
                        <TouchableOpacity
                          onPress={() => handleOpenURL(getXURL(event.socialMediaHandles!.x!))}
                          activeOpacity={0.7}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <XSymbol size={20} color={textColor} />
                          <Text style={{
                            color: textColor,
                            fontSize: 14,
                          }}>
                            {event.socialMediaHandles.x}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {event.socialMediaHandles.instagram && (
                        <TouchableOpacity
                          onPress={() => handleOpenURL(getInstagramURL(event.socialMediaHandles!.instagram!))}
                          activeOpacity={0.7}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                          <Text style={{
                            color: textColor,
                            fontSize: 14,
                          }}>
                            {event.socialMediaHandles.instagram}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {event.socialMediaHandles.facebook && (
                        <TouchableOpacity
                          onPress={() => handleOpenURL(getFacebookURL(event.socialMediaHandles!.facebook!))}
                          activeOpacity={0.7}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                          <Text style={{
                            color: textColor,
                            fontSize: 14,
                          }}>
                            {event.socialMediaHandles.facebook}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </GlassView>
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

