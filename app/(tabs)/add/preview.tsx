import { DatePicker, Host, TextField, Toggle } from '@expo/ui/swift-ui';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/theme';
import { Event, EventDate, SocialMediaHandles, useEvents } from '../../../contexts/EventContext';
import { useLocationSelection } from '../../../contexts/LocationSelectionContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { parsePriceToNumber } from '../../../services/eventParser';
import { geocodeLocation } from '../../../services/geocodingService';

// Day settings interface
interface DaySettings {
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  isAllDay: boolean;
}

// Validation error types
interface ValidationErrors {
  title?: string;
  date?: string;
  time?: string;
  address?: string;
  cost?: string;
  websiteUrl?: string;
  description?: string;
  organizationName?: string;
  instagram?: string;
  facebook?: string;
}

// Validation helper functions
const validateTitle = (title: string): string | undefined => {
  const trimmed = title.trim();
  if (!trimmed) {
    return 'Event title is required';
  }
  if (trimmed.length > 200) {
    return 'Event title must be less than 200 characters';
  }
  return undefined;
};

const validateDaySettings = (daySettings: DaySettings[]): string | undefined => {
  if (!daySettings || daySettings.length === 0) {
    return 'At least one event date is required';
  }
  for (const day of daySettings) {
    if (!day.date || isNaN(day.date.getTime())) {
      return 'Please select valid dates';
    }
    // If not all day, validate times
    if (!day.isAllDay) {
      if (!day.startTime || isNaN(day.startTime.getTime())) {
        return 'Please select a valid start time';
      }
      if (day.endTime && !isNaN(day.endTime.getTime())) {
        // Validate end time is after start time
        if (day.endTime.getTime() <= day.startTime.getTime()) {
          return 'End time must be after start time';
        }
      }
    }
  }
  return undefined;
};

const validateTime = (time: Date | null): string | undefined => {
  if (!time) {
    return undefined; // Time is optional
  }
  if (isNaN(time.getTime())) {
    return 'Please select a valid time';
  }
  return undefined;
};

const validateURL = (url: string): string | undefined => {
  const trimmed = url.trim();
  if (!trimmed) {
    return undefined; // URL is optional
  }
  // Try to validate URL - prepend https:// if no protocol is present
  try {
    let urlToValidate = trimmed;
    if (!trimmed.match(/^https?:\/\//i)) {
      urlToValidate = `https://${trimmed}`;
    }
    new URL(urlToValidate);
    return undefined;
  } catch {
    return 'Please enter a valid URL';
  }
};

const validatePrice = (cost: string): string | undefined => {
  const trimmed = cost.trim();
  if (!trimmed) {
    return undefined; // Price is optional
  }
  const price = parsePriceToNumber(trimmed);
  if (price === null && trimmed.toLowerCase() !== 'free') {
    return 'Please enter a valid price (e.g., $25 or Free)';
  }
  return undefined;
};

const validateDescription = (description: string): string | undefined => {
  const trimmed = description.trim();
  if (trimmed.length > 2000) {
    return 'Description must be less than 2000 characters';
  }
  return undefined;
};

const validateOrganizationName = (name: string): string | undefined => {
  const trimmed = name.trim();
  if (trimmed.length > 100) {
    return 'Organization name must be less than 100 characters';
  }
  return undefined;
};

const validateSocialHandle = (handle: string, platform: string): string | undefined => {
  const trimmed = handle.trim();
  if (!trimmed) {
    return undefined; // Social handles are optional
  }
  // Basic validation - no spaces, reasonable length
  if (trimmed.includes(' ')) {
    return `${platform} handle cannot contain spaces`;
  }
  if (trimmed.length > 50) {
    return `${platform} handle must be less than 50 characters`;
  }
  return undefined;
};

export default function PreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addEvent, userLocation } = useEvents();
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

  // Helper function to extract initial day settings from EventDate array
  const extractInitialDaySettings = (eventData: Partial<Event>): DaySettings[] => {
    if (eventData.dates && eventData.dates.length > 0) {
      return eventData.dates.map(dateItem => {
        const startDate = new Date(dateItem.start);
        if (isNaN(startDate.getTime())) {
          // Invalid date, use today
          const today = new Date();
          return {
            date: today,
            startTime: null,
            endTime: null,
            isAllDay: true,
          };
        }

        // Check if this is an all-day event (midnight UTC for legacy, or midnight local for new)
        const utcHours = startDate.getUTCHours();
        const utcMinutes = startDate.getUTCMinutes();
        const isAllDay = !dateItem.end && ((utcHours === 0 && utcMinutes === 0) || (startDate.getHours() === 0 && startDate.getMinutes() === 0));

        // Extract date (without time) - use local date components
        const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

        // Extract start time if not all day
        let startTime: Date | null = null;
        if (!isAllDay) {
          // Create a time-only date object for the picker
          // Use a fixed date (today) with the time from startDate
          const timeDate = new Date();
          timeDate.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
          startTime = timeDate;
        }

        // Extract end time if present
        let endTime: Date | null = null;
        if (dateItem.end) {
          const endDate = new Date(dateItem.end);
          if (!isNaN(endDate.getTime())) {
            // Create a time-only date object for the picker
            const timeDate = new Date();
            timeDate.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0);
            endTime = timeDate;
          }
        }

        return {
          date,
          startTime,
          endTime,
          isAllDay,
        };
      });
    }
    // Default to today with all day
    return [{
      date: new Date(),
      startTime: null,
      endTime: null,
      isAllDay: true,
    }];
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
    return '';
  };

  const initialDaySettings = extractInitialDaySettings(initialEventData);
  const initialPrice = extractPriceString(initialEventData);

  // Form state
  const [title, setTitle] = useState(initialEventData.title || '');
  const [daySettings, setDaySettings] = useState<DaySettings[]>(initialDaySettings);
  const [address, setAddress] = useState(initialEventData.address || '');
  const [selectedLatitude, setSelectedLatitude] = useState<number | undefined>(initialEventData.latitude);
  const [selectedLongitude, setSelectedLongitude] = useState<number | undefined>(initialEventData.longitude);
  const [cost, setCost] = useState(initialPrice);
  const [isFree, setIsFree] = useState(initialPrice === 'Free' || initialEventData.price === 0);
  const [websiteUrl, setWebsiteUrl] = useState(initialEventData.websiteUrl || '');
  const [description, setDescription] = useState(initialEventData.description || '');
  const [organizationName, setOrganizationName] = useState(initialEventData.organizationName || '');
  const [instagram, setInstagram] = useState(initialEventData.socialMediaHandles?.instagram || '');
  const [facebook, setFacebook] = useState(initialEventData.socialMediaHandles?.facebook || '');

  // Validation errors state
  const [errors, setErrors] = useState<ValidationErrors>({});

  const { pendingLocationSelection, setPendingLocationSelection } = useLocationSelection();

  // When returning from location-search modal, apply the selected location
  useFocusEffect(
    useCallback(() => {
      if (pendingLocationSelection) {
        const displayName = pendingLocationSelection.display_name || '';
        setAddress(displayName);
        if (pendingLocationSelection.lat !== undefined && pendingLocationSelection.lon !== undefined) {
          const lat = typeof pendingLocationSelection.lat === 'string' ? parseFloat(pendingLocationSelection.lat) : pendingLocationSelection.lat;
          const lon = typeof pendingLocationSelection.lon === 'string' ? parseFloat(pendingLocationSelection.lon) : pendingLocationSelection.lon;
          if (!isNaN(lat) && !isNaN(lon)) {
            setSelectedLatitude(lat);
            setSelectedLongitude(lon);
          } else {
            setSelectedLatitude(undefined);
            setSelectedLongitude(undefined);
          }
        } else {
          setSelectedLatitude(undefined);
          setSelectedLongitude(undefined);
        }
        setPendingLocationSelection(null);
      }
    }, [pendingLocationSelection, setPendingLocationSelection])
  );

  // Update state when params change
  useEffect(() => {
    const daySettings = extractInitialDaySettings(initialEventData);
    const priceStr = extractPriceString(initialEventData);

    setTitle(initialEventData.title || '');
    setDaySettings(daySettings);
    setAddress(initialEventData.address || '');
    setCost(priceStr);
    setIsFree(priceStr === 'Free' || initialEventData.price === 0);
    setWebsiteUrl(initialEventData.websiteUrl || '');
    setDescription(initialEventData.description || '');
    setOrganizationName(initialEventData.organizationName || '');
    setInstagram(initialEventData.socialMediaHandles?.instagram || '');
    setFacebook(initialEventData.socialMediaHandles?.facebook || '');
    setErrors({}); // Clear errors when data changes
  }, [params.eventData, params.posterImageUri]);

  // Check if form is valid without setting errors (for button state)
  const checkFormValid = (): boolean => {
    const titleError = validateTitle(title);
    if (titleError) return false;

    const datesError = validateDaySettings(daySettings);
    if (datesError) return false;

    // Location (lat/long) is required
    if (selectedLatitude === undefined || selectedLongitude === undefined) return false;

    const costError = validatePrice(cost);
    if (costError) return false;

    const urlError = validateURL(websiteUrl);
    if (urlError) return false;

    const descError = validateDescription(description);
    if (descError) return false;

    const orgError = validateOrganizationName(organizationName);
    if (orgError) return false;

    const instagramError = validateSocialHandle(instagram, 'Instagram');
    if (instagramError) return false;

    const facebookError = validateSocialHandle(facebook, 'Facebook');
    if (facebookError) return false;

    return true;
  };

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    const titleError = validateTitle(title);
    if (titleError) newErrors.title = titleError;

    const datesError = validateDaySettings(daySettings);
    if (datesError) newErrors.date = datesError;

    // Location (lat/long) is required — user must select from search to set coordinates
    if (selectedLatitude === undefined || selectedLongitude === undefined) {
      newErrors.address = 'Please search and select a location (required).';
    }

    const costError = validatePrice(cost);
    if (costError) newErrors.cost = costError;

    const urlError = validateURL(websiteUrl);
    if (urlError) newErrors.websiteUrl = urlError;

    const descError = validateDescription(description);
    if (descError) newErrors.description = descError;

    const orgError = validateOrganizationName(organizationName);
    if (orgError) newErrors.organizationName = orgError;

    const instagramError = validateSocialHandle(instagram, 'Instagram');
    if (instagramError) newErrors.instagram = instagramError;

    const facebookError = validateSocialHandle(facebook, 'Facebook');
    if (facebookError) newErrors.facebook = facebookError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    title,
    daySettings,
    selectedLatitude,
    selectedLongitude,
    cost,
    websiteUrl,
    description,
    organizationName,
    instagram,
    facebook,
  ]);

  // Keep `errors` in sync with the current form state so submission
  // disabling is explainable via inline messages/borders.
  useEffect(() => {
    validateForm();
  }, [validateForm]);

  const handleSave = async () => {
    // Validate form before submission
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form before submitting.');
      return;
    }

    if (daySettings.length === 0) {
      Alert.alert('Error', 'Please select at least one event date');
      return;
    }

    setIsSaving(true);

    try {
      // Convert day settings to EventDate format
      const dates: EventDate[] = daySettings.map(day => {
        if (day.isAllDay) {
          // All-day event: local midnight for that date, then store as UTC
          const dateOnly = new Date(
            day.date.getFullYear(),
            day.date.getMonth(),
            day.date.getDate(),
            0, 0, 0, 0
          );
          return {
            start: dateOnly.toISOString(),
          };
        } else {
          // Event with time: combine date and start time
          const startDateTime = new Date(
            day.date.getFullYear(),
            day.date.getMonth(),
            day.date.getDate(),
            day.startTime ? day.startTime.getHours() : 0,
            day.startTime ? day.startTime.getMinutes() : 0,
            0, 0
          );

          const eventDateItem: EventDate = {
            start: startDateTime.toISOString(),
          };

          // Add end time if provided
          if (day.endTime) {
            const endDateTime = new Date(
              day.date.getFullYear(),
              day.date.getMonth(),
              day.date.getDate(),
              day.endTime.getHours(),
              day.endTime.getMinutes(),
              0, 0
            );
            eventDateItem.end = endDateTime.toISOString();
          }

          return eventDateItem;
        }
      });

      // Parse price to number - if isFree is true, always set to 0, otherwise parse the cost string
      let price: number | null;
      if (isFree) {
        price = 0; // Free events always save as 0
      } else {
        price = parsePriceToNumber(cost.trim() || undefined);
      }

      // Use coordinates from autocomplete if available, otherwise geocode
      let locationName: string | undefined;
      let latitude: number | undefined;
      let longitude: number | undefined;

      // If we have coordinates from autocomplete, use them directly
      if (selectedLatitude !== undefined && selectedLongitude !== undefined) {
        latitude = selectedLatitude;
        longitude = selectedLongitude;
        locationName = address.trim() || undefined;
      } else if (address.trim()) {
        // Otherwise, try to geocode the address
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
      if (instagram.trim()) socialMediaHandles.instagram = instagram.trim();
      if (facebook.trim()) socialMediaHandles.facebook = facebook.trim();

      // Format website URL - prepend https:// if no protocol is present
      let formattedWebsiteUrl: string | undefined;
      if (websiteUrl.trim()) {
        const trimmedUrl = websiteUrl.trim();
        if (trimmedUrl.match(/^https?:\/\//i)) {
          formattedWebsiteUrl = trimmedUrl;
        } else {
          formattedWebsiteUrl = `https://${trimmedUrl}`;
        }
      }

      const eventData: Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        dates,
        price,
        address: address.trim() || undefined,
        websiteUrl: formattedWebsiteUrl,
        socialMediaHandles: Object.keys(socialMediaHandles).length > 0 ? socialMediaHandles : undefined,
        description: description.trim() || undefined,
        organizationName: organizationName.trim() || undefined,
        posterImage: posterImageUri || '',
        locationName,
        latitude,
        longitude,
      };

      console.log('[PreviewScreen] Saving event:', JSON.stringify(eventData, null, 2));
      await addEvent(eventData, posterImageUri);

      router.dismissAll();
    } catch (error) {
      console.error('[PreviewScreen] Error saving event:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const iconColor = Colors[colorScheme].icon;
  const placeholderColor = iconColor;
  const errorColor = Colors[colorScheme].error;

  // Check if form is valid for submit button state
  // Use checkFormValid to ensure button state updates when errors are fixed
  const isFormValid = title.trim() && daySettings.length > 0 && checkFormValid();

  // Helper functions for managing day settings
  const addDay = () => {
    // Default new date to previous date + 1 day, or today if no dates exist
    let newDate: Date;
    if (daySettings.length > 0) {
      const lastDay = daySettings[daySettings.length - 1];
      newDate = new Date(lastDay.date);
      newDate.setDate(newDate.getDate() + 1);
    } else {
      newDate = new Date();
    }

    const newDay: DaySettings = {
      date: newDate,
      startTime: null,
      endTime: null,
      isAllDay: true,
    };

    setDaySettings([...daySettings, newDay]);
  };

  const removeDay = (index: number) => {
    if (daySettings.length > 1) {
      setDaySettings(daySettings.filter((_, i) => i !== index));
    }
  };

  const updateDay = (index: number, updates: Partial<DaySettings>) => {
    const updated = [...daySettings];
    updated[index] = { ...updated[index], ...updates };
    setDaySettings(updated);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: insets.top }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="never"
          keyboardDismissMode="on-drag"
        >
          <View style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1,
            flexDirection: 'row',
            gap: 12,
          }}>
            <Pressable onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}>
              {({ pressed }) => (
                <GlassView
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    opacity: pressed ? 0.7 : 1,
                  }}
                  glassEffectStyle="regular"
                >
                  <Ionicons name="close" size={22} color={textColor} />
                </GlassView>
              )}
            </Pressable>
          </View>

          {/* Poster Image */}
          {posterImageUri ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
              <View style={{
                width: '100%',
                aspectRatio: 2 / 3,
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: colorScheme === 'dark' ? Colors.dark.background : '#E5E7EB',
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

          {/* Form Fields */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 20 }}>
            {/* Title Field */}
            <GlassView
              style={{
                borderRadius: 20,
                padding: 20,
                overflow: 'hidden',
                borderWidth: errors.title ? 1 : 0,
                borderColor: errorColor,
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
                Event Title *
              </Text>
              <Host matchContents>
                <TextField
                  defaultValue={title}
                  onChangeText={(text) => {
                    setTitle(text);
                  }}
                  placeholder="Enter event title"
                />
              </Host>
              {errors.title && (
                <Text style={{
                  color: errorColor,
                  fontSize: 12,
                  marginTop: 8,
                }}>
                  {errors.title}
                </Text>
              )}
            </GlassView>

            {/* Event Dates Section */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{
                  color: textColor,
                  fontSize: 16,
                  fontWeight: '600',
                  opacity: 0.7,
                }}>
                  Event Dates *
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    addDay();
                  }}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: tintColor,
                  }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                {daySettings.map((day, index) => (
                  <GlassView
                    key={index}
                    style={{
                      borderRadius: 20,
                      padding: 16,
                      overflow: 'hidden',
                      borderWidth: errors.date || errors.time ? 1 : 0,
                      borderColor: errorColor,
                    }}
                    glassEffectStyle="regular"
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{
                        color: textColor,
                        fontSize: 14,
                        fontWeight: '600',
                        opacity: 0.7,
                      }}>
                        Day {index + 1}
                      </Text>
                      {daySettings.length > 1 && (
                        <TouchableOpacity
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            removeDay(index);
                          }}
                          activeOpacity={0.7}
                          style={{
                            padding: 6,
                            borderRadius: 6,
                            backgroundColor: colorScheme === 'dark' ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 0, 0, 0.1)',
                          }}
                        >
                          <Ionicons name="close" size={16} color={errorColor} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={{ gap: 12 }}>
                      {/* Date row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{
                          color: textColor,
                          fontSize: 14,
                          fontWeight: '600',
                        }}>
                          Date:
                        </Text>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Host matchContents>
                            <DatePicker
                              displayedComponents={["date"]}
                              selection={day.date}
                              onDateChange={(newDate: Date) => {
                                updateDay(index, { date: newDate });
                              }}
                            />
                          </Host>
                        </View>
                      </View>

                      {/* All Day row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{
                          color: textColor,
                          fontSize: 14,
                          fontWeight: '600',
                        }}>
                          All Day:
                        </Text>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Host matchContents>
                            <Toggle
                              isOn={day.isAllDay}
                              onIsOnChange={(checked: boolean) => {
                                updateDay(index, {
                                  isAllDay: checked,
                                  startTime: checked ? null : (day.startTime || new Date()),
                                  endTime: checked ? null : day.endTime,
                                });
                              }}
                              label="All Day"
                            />
                          </Host>
                        </View>
                      </View>

                      {/* Start Time row - Only show if not all day */}
                      {!day.isAllDay && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{
                            color: textColor,
                            fontSize: 14,
                            fontWeight: '600',
                          }}>
                            Start:
                          </Text>
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Host matchContents>
                              <DatePicker
                                displayedComponents={["hourAndMinute"]}
                                selection={day.startTime || new Date()}
                                onDateChange={(date: Date) => {
                                  updateDay(index, { startTime: date });
                                }}
                              />
                            </Host>
                          </View>
                        </View>
                      )}

                      {/* End Time row - Only show if not all day */}
                      {!day.isAllDay && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{
                            color: textColor,
                            fontSize: 14,
                            fontWeight: '600',
                          }}>
                            End:
                          </Text>
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Host matchContents>
                              <DatePicker
                                displayedComponents={["hourAndMinute"]}
                                selection={day.endTime || new Date()}
                                onDateChange={(date: Date) => {
                                  updateDay(index, { endTime: date });
                                }}
                              />
                            </Host>
                          </View>
                        </View>
                      )}
                    </View>
                  </GlassView>
                ))}
              </View>

              {errors.date && (
                <Text style={{
                  color: errorColor,
                  fontSize: 12,
                  marginTop: 8,
                }}>
                  {errors.date}
                </Text>
              )}
              {errors.time && (
                <Text style={{
                  color: errorColor,
                  fontSize: 12,
                  marginTop: 8,
                }}>
                  {errors.time}
                </Text>
              )}
            </View>

            {/* Location Field */}
            <GlassView
              style={{
                borderRadius: 20,
                padding: 20,
                overflow: 'hidden',
                borderWidth: errors.address ? 1 : 0,
                borderColor: errorColor,
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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/add/location-search',
                    params: address ? { initialAddress: address } : undefined,
                  });
                }}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: address ? textColor : textColor + '99',
                    fontWeight: '500',
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {address || 'Search for a location...'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={textColor + '99'} />
              </TouchableOpacity>
              {errors.address && (
                <Text style={{
                  color: errorColor,
                  fontSize: 12,
                  marginTop: 8,
                }}>
                  {errors.address}
                </Text>
              )}
            </GlassView>

            {/* Cost Field */}
            <GlassView
              style={{
                borderRadius: 20,
                padding: 20,
                overflow: 'hidden',
                borderWidth: errors.cost ? 1 : 0,
                borderColor: errorColor,
              }}
              glassEffectStyle="regular"
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isFree ? 0 : 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{
                    color: textColor,
                    fontSize: 14,
                    fontWeight: '600',
                    opacity: 0.7,
                  }}>
                    Cost
                  </Text>
                  {isFree && (
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
                  )}
                </View>
                <Host matchContents>
                  <Toggle
                    isOn={!isFree}
                    onIsOnChange={(checked: boolean) => {
                      setIsFree(!checked);
                      if (!checked) {
                        setCost('Free');
                      } else {
                        setCost('');
                      }
                    }}
                    label="Has Price"
                  />
                </Host>
              </View>

              {!isFree && (
                <>
                  <TextInput
                    value={cost && cost !== 'Free' ? cost.replace(/[^0-9.]/g, '') : ''}
                    onChangeText={(text) => {
                      // Filter to only allow numbers and decimal point
                      const numericValue = text.replace(/[^0-9.]/g, '');
                      // Ensure only one decimal point
                      const parts = numericValue.split('.');
                      const filtered = parts.length > 2
                        ? parts[0] + '.' + parts.slice(1).join('')
                        : numericValue;
                      setCost(filtered);
                    }}
                    placeholder="0.00"
                    placeholderTextColor={placeholderColor}
                    keyboardType="decimal-pad"
                    style={{
                      color: textColor,
                      fontSize: 16,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      borderWidth: errors.cost ? 1 : 0,
                      borderColor: errorColor,
                    }}
                  />
                  {errors.cost && (
                    <Text style={{
                      color: errorColor,
                      fontSize: 12,
                      marginTop: 8,
                    }}>
                      {errors.cost}
                    </Text>
                  )}
                  {cost && cost !== 'Free' && cost.trim() !== '' && (() => {
                    const numericValue = cost.replace(/[^0-9.]/g, '');
                    if (numericValue && !isNaN(parseFloat(numericValue))) {
                      const price = parseFloat(numericValue);
                      return (
                        <Text style={{
                          color: textColor,
                          fontSize: 14,
                          opacity: 0.7,
                          marginTop: 8,
                        }}>
                          {`$${price.toFixed(2)}`}
                        </Text>
                      );
                    }
                    return null;
                  })()}
                </>
              )}
            </GlassView>

            {/* Website URL Field */}
            <GlassView
              style={{
                borderRadius: 20,
                padding: 20,
                overflow: 'hidden',
                borderWidth: errors.websiteUrl ? 1 : 0,
                borderColor: errorColor,
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
                Website URL
              </Text>
              <Host matchContents>
                <TextField
                  defaultValue={websiteUrl}
                  onChangeText={(text) => {
                    setWebsiteUrl(text);
                  }}
                  placeholder="https://example.com"
                  autocorrection={false}
                />
              </Host>
              {errors.websiteUrl && (
                <Text style={{
                  color: errorColor,
                  fontSize: 12,
                  marginTop: 8,
                }}>
                  {errors.websiteUrl}
                </Text>
              )}
            </GlassView>

            {/* Organization Name Field */}
            <GlassView
              style={{
                borderRadius: 20,
                padding: 20,
                overflow: 'hidden',
                borderWidth: errors.organizationName ? 1 : 0,
                borderColor: errorColor,
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
                Hosted By
              </Text>
              <Host matchContents>
                <TextField
                  defaultValue={organizationName}
                  onChangeText={(text) => {
                    setOrganizationName(text);
                  }}
                  placeholder="Organization or host name"
                  multiline
                />
              </Host>
              {errors.organizationName && (
                <Text style={{
                  color: errorColor,
                  fontSize: 12,
                  marginTop: 8,
                }}>
                  {errors.organizationName}
                </Text>
              )}
            </GlassView>

            {/* Description Field */}
            <GlassView
              style={{
                borderRadius: 20,
                padding: 20,
                overflow: 'hidden',
                borderWidth: errors.description ? 1 : 0,
                borderColor: errorColor,
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
                Description
              </Text>
              <Host matchContents>
                <TextField
                  defaultValue={description}
                  onChangeText={(text) => {
                    setDescription(text);
                  }}
                  placeholder="Enter event description"
                  multiline
                />
              </Host>
              {errors.description && (
                <Text style={{
                  color: errorColor,
                  fontSize: 12,
                  marginTop: 8,
                }}>
                  {errors.description}
                </Text>
              )}
            </GlassView>

            {/* Social Media Fields */}
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
                Social Media
              </Text>
              <View style={{ gap: 16 }}>
                {/* Instagram */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="logo-instagram" size={22} color="#E4405F" />
                  <View
                    style={{
                      flex: 1,
                      borderWidth: errors.instagram ? 1 : 0,
                      borderColor: errorColor,
                      borderRadius: 12,
                      paddingVertical: 6,
                      paddingHorizontal: 8,
                    }}
                  >
                    <Host matchContents>
                      <TextField
                      defaultValue={instagram}
                      onChangeText={(text) => {
                        setInstagram(text);
                      }}
                      placeholder="@username"
                      autocorrection={false}
                    />
                    </Host>
                  </View>
                </View>
                {errors.instagram && (
                  <Text style={{
                    color: errorColor,
                    fontSize: 12,
                    marginTop: 4,
                  }}>
                    {errors.instagram}
                  </Text>
                )}

                {/* Facebook */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                  <View
                    style={{
                      flex: 1,
                      borderWidth: errors.facebook ? 1 : 0,
                      borderColor: errorColor,
                      borderRadius: 12,
                      paddingVertical: 6,
                      paddingHorizontal: 8,
                    }}
                  >
                    <Host matchContents>
                      <TextField
                      defaultValue={facebook}
                      onChangeText={(text) => {
                        setFacebook(text);
                      }}
                      placeholder="username"
                      autocorrection={false}
                    />
                    </Host>
                  </View>
                </View>
                {errors.facebook && (
                  <Text style={{
                    color: errorColor,
                    fontSize: 12,
                    marginTop: 4,
                  }}>
                    {errors.facebook}
                  </Text>
                )}
              </View>
            </GlassView>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={{ backgroundColor }}>
          <View style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: colorScheme === 'dark' ? Colors.dark.background : '#E5E7EB',
          }}>
            <TouchableOpacity
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                handleSave();
              }}
              disabled={isSaving || !isFormValid}
              activeOpacity={0.85}
              style={{
                backgroundColor: tintColor,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                opacity: (isSaving || !isFormValid) ? 0.5 : 1,
              }}
            >
              {isSaving ? (
                <ActivityIndicator color={textColor} />
              ) : (
                <Ionicons name="save-outline" size={18} color={textColor} />
              )}
              <Text style={{
                color: textColor,
                fontSize: 16,
                fontWeight: '700',
              }}>
                {isSaving ? 'Saving...' : 'Save Event'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}
