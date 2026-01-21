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
import { Colors } from '../../constants/theme';
import { Event, SocialMediaHandles, useEvents } from '../../contexts/EventContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatEventDates, formatDateOnly, formatTime } from '../../utils/dateFormatter';
import { XSymbol } from '../../components/XSymbol';
import { parseDates, parsePriceToNumber } from '../../services/eventParser';
import { geocodeLocation } from '../../services/geocodingService';

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

      const socialMediaHandles: SocialMediaHandles = {};
      if (x.trim()) socialMediaHandles.x = x.trim();
      if (instagram.trim()) socialMediaHandles.instagram = instagram.trim();
      if (facebook.trim()) socialMediaHandles.facebook = facebook.trim();

      const eventToSave: Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        dates: dates,
        price: price,
        locationName: locationName,
        address: address.trim() || undefined,
        latitude: latitude,
        longitude: longitude,
        websiteUrl: websiteUrl.trim() || undefined,
        description: description.trim() || undefined,
        organizationName: organizationName.trim() || undefined,
        socialMediaHandles: Object.keys(socialMediaHandles).length > 0 ? socialMediaHandles : undefined,
        posterImage: '', // Will be set after image upload
      };

      console.log('[PreviewScreen] Saving event with dates:', JSON.stringify(dates, null, 2));
      console.log('[PreviewScreen] Number of dates:', dates.length);

      await addEvent(eventToSave, posterImageUri || initialEventData.posterImage);
      Alert.alert('Success', 'Event saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('[PreviewScreen] Error saving event:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const placeholderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  const placeholderColorLight = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
  const imageBgColor = colorScheme === 'dark' ? '#1F1F1F' : '#E5E7EB';

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {/* Header with close button */}
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}>
          <TouchableOpacity 
            onPress={() => {
              if (!isSaving) {
                router.back();
              }
            }} 
            disabled={isSaving}
            activeOpacity={0.7}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons 
              name="close" 
              size={20} 
              color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
            />
          </TouchableOpacity>
          <View style={{ width: 32 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Poster Image - 2:3 aspect ratio, centered with padding */}
        {posterImageUri && (
          <View style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 24,
            alignItems: 'center',
          }}>
            <View style={{
              width: (width - 40) * 0.6,
              height: ((width - 40) * 0.6 * 3) / 2,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: imageBgColor,
            }}>
              <Image
                source={{ uri: posterImageUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
          </View>
        )}

        {/* Event Information */}
        <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
          {/* Title */}
          {title ? (
            <View style={{ marginBottom: 24 }}>
              <TextInput
                style={{
                  color: textColor,
                  fontSize: 36,
                  fontWeight: '700',
                  textAlign: 'center',
                  paddingVertical: 8,
                }}
                value={title}
                onChangeText={setTitle}
                placeholder="Event Title"
                placeholderTextColor={placeholderColor}
                editable={!isSaving}
                multiline
              />
            </View>
          ) : (
            <View style={{ marginBottom: 24 }}>
              <TextInput
                style={{
                  color: placeholderColor,
                  fontSize: 36,
                  fontWeight: '700',
                  textAlign: 'center',
                  paddingVertical: 8,
                }}
                value=""
                onChangeText={setTitle}
                placeholder="Event Title *"
                placeholderTextColor={placeholderColorLight}
                editable={!isSaving}
                multiline
              />
            </View>
          )}

          {/* Single Date - Show under title */}
          {(() => {
            // Use original dates array if available, otherwise parse from date/time strings
            const datesToDisplay = originalDates.length > 0 ? originalDates : parseDates(date || '', time || undefined);
            const hasMultipleDates = datesToDisplay.length > 1;
            
            if (!hasMultipleDates && datesToDisplay.length > 0) {
              return (
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
                    {formatEventDates(datesToDisplay)}
                  </Text>
                </View>
              );
            }
            return null;
          })()}

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
                {cost && (
                  <Text style={{
                    color: textColor,
                    fontSize: 14,
                    opacity: 0.7,
                    marginTop: 4,
                  }}>
                    {(() => {
                      const price = parsePriceToNumber(cost);
                      if (price === 0) return 'Free';
                      if (price === null) return 'Price TBD';
                      return `$${price}`;
                    })()}
                  </Text>
                )}
              </View>
            )}
        </View>

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

        {/* Content cards */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
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
                  <TextInput
                    style={{
                      color: textColor,
                      fontSize: 18,
                      fontWeight: '600',
                    }}
                    value={organizationName}
                    onChangeText={setOrganizationName}
                    placeholder="Organization Name"
                    placeholderTextColor={placeholderColor}
                    editable={!isSaving}
                  />
                </View>
              )}
              {description && (
                <TextInput
                  style={{
                    color: textColor,
                    fontSize: 15,
                    lineHeight: 22,
                  }}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Event description..."
                  placeholderTextColor={placeholderColor}
                  editable={!isSaving}
                  multiline
                  textAlignVertical="top"
                />
              )}
            </GlassView>
          )}

          {/* Date/Time Card */}
          {!date && (
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
                Date *
              </Text>
              <TextInput
                style={{
                  color: textColor,
                  fontSize: 16,
                  paddingVertical: 8,
                }}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={placeholderColorLight}
                editable={!isSaving}
              />
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons name="link-outline" size={20} color={textColor} style={{ opacity: 0.7 }} />
                    <TextInput
                      style={{
                        color: '#3B82F6',
                        fontSize: 16,
                        flex: 1,
                        textDecorationLine: 'underline',
                      }}
                      value={websiteUrl}
                      onChangeText={setWebsiteUrl}
                      placeholder="Website"
                      placeholderTextColor="rgba(59, 130, 246, 0.5)"
                      editable={!isSaving}
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                  </View>
                )}
                {(x || instagram || facebook) && (
                  <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                    {x && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <XSymbol size={20} color={textColor} />
                        <TextInput
                          style={{
                            color: textColor,
                            fontSize: 14,
                          }}
                          value={x}
                          onChangeText={setX}
                          placeholder="@username"
                          placeholderTextColor={placeholderColor}
                          editable={!isSaving}
                          autoCapitalize="none"
                        />
                      </View>
                    )}
                    {instagram && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                        <TextInput
                          style={{
                            color: textColor,
                            fontSize: 14,
                          }}
                          value={instagram}
                          onChangeText={setInstagram}
                          placeholder="@username"
                          placeholderTextColor={placeholderColor}
                          editable={!isSaving}
                          autoCapitalize="none"
                        />
                      </View>
                    )}
                    {facebook && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                        <TextInput
                          style={{
                            color: textColor,
                            fontSize: 14,
                          }}
                          value={facebook}
                          onChangeText={setFacebook}
                          placeholder="Page name"
                          placeholderTextColor={placeholderColor}
                          editable={!isSaving}
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            </GlassView>
          )}
        </View>
      </ScrollView>

      {/* Submit Button - Fixed at bottom */}
      <View style={{
        position: 'absolute',
        bottom: insets.bottom + 20,
        left: 20,
        right: 20,
      }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.7}
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
            {isSaving ? (
              <ActivityIndicator color={tintColor} />
            ) : (
              <Text style={{ color: tintColor, fontSize: 16, fontWeight: '600' }}>
                Submit
              </Text>
            )}
          </GlassView>
        </TouchableOpacity>
      </View>
    </View>
  );
}
