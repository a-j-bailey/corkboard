import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { XSymbol } from '../../../components/XSymbol';
import { Colors } from '../../../constants/theme';
import { Event, SocialMediaHandles, useEvents } from '../../../contexts/EventContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { parseDates, parsePriceToNumber } from '../../../services/eventParser';
import { geocodeLocation } from '../../../services/geocodingService';
import { formatDateOnly, formatTime } from '../../../utils/dateFormatter';

export default function PreviewScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { addEvent } = useEvents();
  const { colorScheme } = useTheme();
  const backgroundColor = Colors[colorScheme].background;
  const textColor = Colors[colorScheme].text;
  const tintColor = Colors[colorScheme].tint;
  const [isSaving, setIsSaving] = useState(false);
  
  // Get params from route
  const params = useLocalSearchParams<{
    eventData?: string;
    posterImageUri?: string;
  }>();

  // Parse event data from route params
  let initialEventData: Partial<Event> = {};
  try {
    if (params.eventData) {
      initialEventData = JSON.parse(decodeURIComponent(params.eventData));
    }
  } catch (error) {
    console.error('[PreviewScreen] Error parsing event data from params:', error);
  }
  
  const posterImageUri = params.posterImageUri || undefined;

  // Helper function to extract date and time strings from EventDate array or old format
  const extractDateAndTime = (eventData: Partial<Event>): { date: string; time: string } => {
    // Check if we have the new dates array format
    if (eventData.dates && eventData.dates.length > 0) {
      const firstDate = new Date(eventData.dates[0].start);
      if (!isNaN(firstDate.getTime())) {
        const dateStr = firstDate.toISOString().split('T')[0]; // YYYY-MM-DD
        let timeStr = '';
        
        // Extract time if present
        if (firstDate.getHours() !== 0 || firstDate.getMinutes() !== 0) {
          const hours = firstDate.getHours();
          const minutes = firstDate.getMinutes();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          timeStr = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        }
        
        // If there's an end time, append it
        if (eventData.dates[0].end) {
          const endDate = new Date(eventData.dates[0].end);
          if (!isNaN(endDate.getTime())) {
            const endHours = endDate.getHours();
            const endMinutes = endDate.getMinutes();
            const endAmpm = endHours >= 12 ? 'PM' : 'AM';
            const endDisplayHours = endHours % 12 || 12;
            timeStr += ` - ${endDisplayHours}:${endMinutes.toString().padStart(2, '0')} ${endAmpm}`;
          }
        }
        
        return { date: dateStr, time: timeStr };
      }
    }
    
    // Fall back to old format
    return {
      date: (eventData as any).date || '',
      time: (eventData as any).time || '',
    };
  };

  // Helper function to extract price string from number or old format
  const extractPriceString = (eventData: Partial<Event>): string => {
    if (eventData.price !== null && eventData.price !== undefined) {
      if (eventData.price === 0) {
        return 'Free';
      } else {
        return `$${eventData.price}`;
      }
    }
    return (eventData as any).cost || '';
  };

  const initialDateAndTime = extractDateAndTime(initialEventData);
  const initialPrice = extractPriceString(initialEventData);

  // Store the original dates array if it exists (for multiple dates display)
  const [originalDates, setOriginalDates] = useState(initialEventData.dates || []);

  const [title, setTitle] = useState(initialEventData.title || '');
  const [date, setDate] = useState(initialDateAndTime.date);
  const [time, setTime] = useState(initialDateAndTime.time);
  const [address, setAddress] = useState(initialEventData.address || '');
  const [cost, setCost] = useState(initialPrice);
  const [websiteUrl, setWebsiteUrl] = useState(initialEventData.websiteUrl || '');
  const [description, setDescription] = useState(initialEventData.description || '');
  const [organizationName, setOrganizationName] = useState(initialEventData.organizationName || '');
  const [x, setX] = useState(initialEventData.socialMediaHandles?.x || '');
  const [instagram, setInstagram] = useState(initialEventData.socialMediaHandles?.instagram || '');
  const [facebook, setFacebook] = useState(initialEventData.socialMediaHandles?.facebook || '');

  // Update state when params change
  useEffect(() => {
    const dateAndTime = extractDateAndTime(initialEventData);
    const priceStr = extractPriceString(initialEventData);
    
    // Store original dates array if it exists
    if (initialEventData.dates && initialEventData.dates.length > 0) {
      setOriginalDates(initialEventData.dates);
    } else {
      setOriginalDates([]);
    }
    
    setTitle(initialEventData.title || '');
    setDate(dateAndTime.date);
    setTime(dateAndTime.time);
    setAddress(initialEventData.address || '');
    setCost(priceStr);
    setWebsiteUrl(initialEventData.websiteUrl || '');
    setDescription(initialEventData.description || '');
    setOrganizationName(initialEventData.organizationName || '');
    setX(initialEventData.socialMediaHandles?.x || '');
    setInstagram(initialEventData.socialMediaHandles?.instagram || '');
    setFacebook(initialEventData.socialMediaHandles?.facebook || '');
  }, [params.eventData, params.posterImageUri]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (!date.trim()) {
      Alert.alert('Error', 'Please enter an event date');
      return;
    }

    setIsSaving(true);

    try {
      // Use original dates array if available, otherwise parse from date/time strings
      let dates: Array<{start: string, end?: string}>;
      if (originalDates.length > 0) {
        // Use the original dates array from the extracted data
        dates = originalDates;
        console.log('[PreviewScreen] Using original dates array:', dates.length, 'dates');
      } else {
        // Parse dates from the date/time input fields
        dates = parseDates(date.trim(), time.trim() || undefined);
        if (dates.length === 0) {
          Alert.alert('Error', 'Could not parse event date. Please check the format.');
          setIsSaving(false);
          return;
        }
        console.log('[PreviewScreen] Parsed dates from input:', dates.length, 'dates');
      }

      // Parse price to number
      const price = parsePriceToNumber(cost.trim() || undefined);

      // Geocode location if provided
      let locationName: string | undefined;
      let latitude: number | undefined;
      let longitude: number | undefined;
      
      if (address.trim()) {
        try {
          const geocoded = await geocodeLocation(address.trim());
          if (geocoded) {
            locationName = geocoded.name;
            latitude = geocoded.latitude;
            longitude = geocoded.longitude;
          }
        } catch (geocodeError) {
          console.warn('[PreviewScreen] Geocoding failed, saving without coordinates:', geocodeError);
          // Continue without geocoding
        }
      }

      // Construct social media handles object
      const socialMediaHandles: SocialMediaHandles = {};
      if (x.trim()) socialMediaHandles.x = x.trim();
      if (instagram.trim()) socialMediaHandles.instagram = instagram.trim();
      if (facebook.trim()) socialMediaHandles.facebook = facebook.trim();

      const eventData: Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        dates,
        price,
        address: address.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        socialMediaHandles: Object.keys(socialMediaHandles).length > 0 ? socialMediaHandles : undefined,
        description: description.trim() || undefined,
        organizationName: organizationName.trim() || undefined,
        posterImage: posterImageUri || '',
        locationName,
        latitude,
        longitude,
      };

      console.log('[PreviewScreen] Saving event:', JSON.stringify(eventData, null, 2));
      const newEvent = await addEvent(eventData, posterImageUri);

      router.replace(`/event/${newEvent.id}`);
    } catch (error) {
      console.error('[PreviewScreen] Error saving event:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const placeholderColor = colorScheme === 'dark' ? '#6B7280' : '#9CA3AF';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          position: 'absolute',
          top: insets.top + 12,
          right: 16,
          zIndex: 1,
          flexDirection: 'row',
          gap: 12,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: Colors[colorScheme].background,
            }}
          >
            <Ionicons name="close" size={22} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Poster Image */}
        {posterImageUri ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <View style={{
              width: '100%',
              aspectRatio: 2 / 3,
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: colorScheme === 'dark' ? '#1F1F1F' : '#E5E7EB',
            }}>
              <Image
                source={{ uri: posterImageUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <GlassView
              style={{
                borderRadius: 16,
                padding: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              glassEffectStyle="regular"
            >
              <Text style={{ color: textColor, opacity: 0.6 }}>
                No poster image available
              </Text>
            </GlassView>
          </View>
        )}

        {/* Title */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <TextInput
            style={{
              color: textColor,
              fontSize: 28,
              fontWeight: '700',
              marginBottom: 12,
              textAlign: 'center',
            }}
            value={title}
            onChangeText={setTitle}
            placeholder="Event Title"
            placeholderTextColor={placeholderColor}
            editable={!isSaving}
          />
        </View>

        {/* Date and Time */}
        <View style={{ paddingHorizontal: 20 }}>
          <TextInput
            style={{
              color: textColor,
              fontSize: 16,
              fontWeight: '500',
              textAlign: 'center',
              marginBottom: 8,
            }}
            value={date}
            onChangeText={setDate}
            placeholder="Event Date(s)"
            placeholderTextColor={placeholderColor}
            editable={!isSaving}
          />
          <TextInput
            style={{
              color: textColor,
              fontSize: 16,
              fontWeight: '400',
              textAlign: 'center',
              marginBottom: 8,
            }}
            value={time}
            onChangeText={setTime}
            placeholder="Time"
            placeholderTextColor={placeholderColor}
            editable={!isSaving}
          />
        </View>

        {/* Location - Centered */}
        {address && (
          <View style={{
            alignItems: 'center',
            marginBottom: 12,
          }}>
            <TextInput
              style={{
                color: textColor,
                fontSize: 18,
                fontWeight: '400',
                textAlign: 'center',
              }}
              value={address}
              onChangeText={setAddress}
              placeholder="Location"
              placeholderTextColor={placeholderColor}
              editable={!isSaving}
              multiline
            />
          </View>
        )}

        {/* Cost - Centered */}
          {cost && (
            <View style={{
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <TextInput
                style={{
                  color: textColor,
                  fontSize: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
                value={cost}
                onChangeText={setCost}
                placeholder="Cost"
                placeholderTextColor={placeholderColor}
                editable={!isSaving}
              />
              {cost && (() => {
                const price = parsePriceToNumber(cost);
                if (price === 0) {
                  return (
                    <View style={{
                      backgroundColor: Colors[colorScheme].green,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      marginTop: 6,
                    }}>
                      <Text style={{
                        color: Colors[colorScheme].background,
                        fontSize: 14,
                        fontWeight: '700',
                      }}>
                        Free
                      </Text>
                    </View>
                  );
                }
                if (price === null) return null;
                return (
                  <Text style={{
                    color: textColor,
                    fontSize: 14,
                    opacity: 0.7,
                    marginTop: 4,
                  }}>
                    {`$${price}`}
                  </Text>
                );
              })()}
            </View>
          )}

        {/* Multiple Dates Card - Show above details if more than one date */}
        {(() => {
          // Use original dates array if available, otherwise parse from date/time strings
          const datesToDisplay = originalDates.length > 0 ? originalDates : parseDates(date || '', time || undefined);
          const hasMultipleDates = datesToDisplay.length > 1;
          
          if (hasMultipleDates) {
            return (
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
                    {datesToDisplay.map((dateItem, index) => {
                      const dateObj = new Date(dateItem.start);
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
                              {dateItem.end && ` - ${formatTime(new Date(dateItem.end))}`}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </GlassView>
              </View>
            );
          }
          return null;
        })()}

        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
          {/* Location Card */}
          {(address || originalDates.length > 0) && (
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
                onPress={() => {}}
                activeOpacity={0.7}
                style={{ alignItems: 'flex-start', gap: 6 }}
              >
                <Text style={{
                  color: '#3B82F6',
                  fontSize: 18,
                  fontWeight: '500',
                  textDecorationLine: 'underline',
                }}>
                  {address || 'Location not set'}
                </Text>
              </TouchableOpacity>
            </GlassView>
          )}

          {/* Host/Description Card */}
          {(organizationName || description) && (
            <GlassView
              style={{
                borderRadius: 20,
                padding: 20,
                overflow: 'hidden',
              }}
              glassEffectStyle="regular"
            >
                {organizationName && (
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
                      {organizationName}
                  </Text>
                </View>
              )}
                {description && (
                <Text style={{
                  color: textColor,
                  fontSize: 15,
                  lineHeight: 22,
                }}>
                    {description}
                </Text>
              )}
            </GlassView>
          )}

          {/* Additional Details Card */}
          {(websiteUrl || x || instagram || facebook) && (
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
                {websiteUrl && (
                  <TouchableOpacity
                    onPress={() => {}}
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
                      {websiteUrl}
                    </Text>
                  </TouchableOpacity>
                )}
                {(x || instagram || facebook) && (
                  <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                    {x && (
                      <TouchableOpacity
                        onPress={() => {}}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      >
                        <XSymbol size={20} color={textColor} />
                        <Text style={{
                          color: textColor,
                          fontSize: 14,
                        }}>
                          {x}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {instagram && (
                      <TouchableOpacity
                        onPress={() => {}}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      >
                        <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                        <Text style={{
                          color: textColor,
                          fontSize: 14,
                        }}>
                          {instagram}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {facebook && (
                      <TouchableOpacity
                        onPress={() => {}}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      >
                        <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                        <Text style={{
                          color: textColor,
                          fontSize: 14,
                        }}>
                          {facebook}
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

      {/* Save Button */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor }}>
        <View style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#1F2937' : '#E5E7EB',
        }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
            style={{
              backgroundColor: tintColor,
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? (
              <ActivityIndicator color={Colors[colorScheme].text} />
            ) : (
              <Ionicons name="save-outline" size={18} color={Colors[colorScheme].text} />
            )}
            <Text style={{
              color: Colors[colorScheme].text,
              fontSize: 16,
              fontWeight: '700',
            }}>
              {isSaving ? 'Saving...' : 'Save Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
