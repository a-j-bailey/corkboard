import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XSymbol } from '../../components/XSymbol';
import { Colors } from '../../constants/theme';
import { useEvents } from '../../contexts/EventContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { formatDateOnly, formatEventDates, formatTime } from '../../utils/dateFormatter';

export default function EventDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const { events, refreshEvents, loading, toggleBookmark } = useEvents();
  const { user } = useUser();
  const textColor = Colors[colorScheme].text;
  const bookmarkGoldColor = Colors[colorScheme].yellow;
  const imageBgColor = colorScheme === 'dark' ? '#1F1F1F' : '#E5E7EB';

  const event = useMemo(
    () => events.find((e) => e.id === id),
    [events, id]
  );

  useEffect(() => {
    if (!event && id && !loading) {
      refreshEvents();
    }
  }, [event, id, loading, refreshEvents]);

  const handleBookmark = async () => {
    if (!user || !event) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await toggleBookmark(event.id);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleReport = () => {
    if (!event) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/report/${event.id}`);
  };

  const handleOpenURL = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  if (!id) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: textColor, fontSize: 16 }}>Missing event id.</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          activeOpacity={0.7}
          style={{
            marginTop: 16,
            backgroundColor: textColor,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: Colors[colorScheme].background, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={textColor} />
        <Text style={{ color: textColor, marginTop: 16, fontSize: 16 }}>Loading event…</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: textColor, fontSize: 16 }}>Event not found.</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          activeOpacity={0.7}
          style={{
            marginTop: 16,
            backgroundColor: textColor,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: Colors[colorScheme].background, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Toolbar placement="right">
        {user && (
          <Stack.Toolbar.Button
            icon={event?.isBookmarked ? 'bookmark.fill' : 'bookmark'}
            tintColor={event?.isBookmarked ? bookmarkGoldColor : undefined}
            onPress={handleBookmark}
          />
        )}
        <Stack.Toolbar.Menu icon="ellipsis.circle">
          <Stack.Toolbar.MenuAction
            icon="exclamationmark.triangle"
            destructive
            onPress={handleReport}
          >
            Report
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <View
        style={{
          flex: 1,
          backgroundColor: Colors[colorScheme].background,
        }}
      >
        <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom, paddingTop: insets.top }}
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
          <View>
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

          {/* Price - Centered (shown under title) */}
          {event.price !== null && event.price !== undefined && (
            <View style={{
              alignItems: 'center',
              marginBottom: 12,
            }}>
              {event.price === 0 ? (
                <View style={{
                  backgroundColor: Colors[colorScheme].green,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                }}>
                  <Text style={{
                    color: Colors[colorScheme].background,
                    fontSize: 14,
                    fontWeight: '700',
                  }}>
                    Free
                  </Text>
                </View>
              ) : (
                <Text style={{
                  color: textColor,
                  fontSize: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                }}>
                  {`$${event.price}`}
                </Text>
              )}
            </View>
          )}

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
          {/* Location Card */}
          {(event.address || event.locationName) && (
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
                Location
              </Text>
              <TouchableOpacity
                onPress={handleOpenLocation}
                activeOpacity={0.7}
                style={{ alignItems: 'flex-start', gap: 6 }}
              >
                <Text style={{
                  color: '#3B82F6',
                  fontSize: 18,
                  fontWeight: '500',
                  textDecorationLine: 'underline',
                }}>
                  {event.locationName || event.address}
                </Text>
                {event.address && event.locationName && event.address !== event.locationName && (
                  <Text style={{
                    color: textColor,
                    fontSize: 14,
                    fontWeight: '300',
                    opacity: 0.8,
                  }}>
                    {event.address}
                  </Text>
                )}
              </TouchableOpacity>
            </GlassView>
          )}

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
    </>
  );
}
