import { BottomSheet, DatePicker, Host, TextField, Toggle } from '@expo/ui/swift-ui';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
  useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { XSymbol } from '../../../components/XSymbol';
import { Colors } from '../../../constants/theme';
import { Event, EventDate, SocialMediaHandles, useEvents } from '../../../contexts/EventContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { parsePriceToNumber } from '../../../services/eventParser';
import { geocodeLocation } from '../../../services/geocodingService';
import { formatDateOnly, formatTime } from '../../../utils/dateFormatter';

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
  x?: string;
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

const validateDates = (dates: Date[]): string | undefined => {
  if (!dates || dates.length === 0) {
    return 'At least one event date is required';
  }
  for (const date of dates) {
    if (!date || isNaN(date.getTime())) {
      return 'Please select valid dates';
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
  const { width, height } = useWindowDimensions();
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

  // Helper function to extract initial dates from EventDate array
  const extractInitialDates = (eventData: Partial<Event>): Date[] => {
    if (eventData.dates && eventData.dates.length > 0) {
      return eventData.dates.map(dateItem => {
        const date = new Date(dateItem.start);
        if (!isNaN(date.getTime())) {
          return date;
        }
        return new Date();
      }).filter(Boolean);
    }
    // Default to today if no date provided
    return [new Date()];
  };

  // Helper function to extract initial start time from EventDate array
  const extractInitialStartTime = (eventData: Partial<Event>): Date | null => {
    if (eventData.dates && eventData.dates.length > 0) {
      const firstDate = new Date(eventData.dates[0].start);
      if (!isNaN(firstDate.getTime())) {
        // Check if time is set (not midnight UTC)
        const utcHours = firstDate.getUTCHours();
        const utcMinutes = firstDate.getUTCMinutes();
        if (utcHours !== 0 || utcMinutes !== 0) {
          // Use local time from the date
          return firstDate;
        }
      }
    }
    return null;
  };

  // Helper function to extract initial end time from EventDate array
  const extractInitialEndTime = (eventData: Partial<Event>): Date | null => {
    if (eventData.dates && eventData.dates.length > 0 && eventData.dates[0].end) {
      const endDate = new Date(eventData.dates[0].end);
      if (!isNaN(endDate.getTime())) {
        return endDate;
      }
    }
    return null;
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

  const initialDates = extractInitialDates(initialEventData);
  const initialStartTime = extractInitialStartTime(initialEventData);
  const initialEndTime = extractInitialEndTime(initialEventData);
  const initialPrice = extractPriceString(initialEventData);

  // Form state
  const [title, setTitle] = useState(initialEventData.title || '');
  const [selectedDates, setSelectedDates] = useState<Date[]>(initialDates);
  const [startTime, setStartTime] = useState<Date | null>(initialStartTime);
  const [endTime, setEndTime] = useState<Date | null>(initialEndTime);
  const [address, setAddress] = useState(initialEventData.address || '');
  const [cost, setCost] = useState(initialPrice);
  const [isFree, setIsFree] = useState(initialPrice === 'Free' || initialEventData.price === 0);
  const [websiteUrl, setWebsiteUrl] = useState(initialEventData.websiteUrl || '');
  const [description, setDescription] = useState(initialEventData.description || '');
  const [organizationName, setOrganizationName] = useState(initialEventData.organizationName || '');
  const [x, setX] = useState(initialEventData.socialMediaHandles?.x || '');
  const [instagram, setInstagram] = useState(initialEventData.socialMediaHandles?.instagram || '');
  const [facebook, setFacebook] = useState(initialEventData.socialMediaHandles?.facebook || '');

  // Validation errors state
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Bottom sheet state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [editingDateIndex, setEditingDateIndex] = useState<number | null>(null);
  const [isEditingStartTime, setIsEditingStartTime] = useState(false);
  const [isEditingEndTime, setIsEditingEndTime] = useState(false);

  // Store the original dates array if it exists (for multiple dates display)
  const [originalDates, setOriginalDates] = useState(initialEventData.dates || []);

  // Update state when params change
  useEffect(() => {
    const dates = extractInitialDates(initialEventData);
    const startTime = extractInitialStartTime(initialEventData);
    const endTime = extractInitialEndTime(initialEventData);
    const priceStr = extractPriceString(initialEventData);
    
    // Store original dates array if it exists
    if (initialEventData.dates && initialEventData.dates.length > 0) {
      setOriginalDates(initialEventData.dates);
    } else {
      setOriginalDates([]);
    }
    
    setTitle(initialEventData.title || '');
    setSelectedDates(dates);
    setStartTime(startTime);
    setEndTime(endTime);
    setAddress(initialEventData.address || '');
    setCost(priceStr);
    setIsFree(priceStr === 'Free' || initialEventData.price === 0);
    setWebsiteUrl(initialEventData.websiteUrl || '');
    setDescription(initialEventData.description || '');
    setOrganizationName(initialEventData.organizationName || '');
    setX(initialEventData.socialMediaHandles?.x || '');
    setInstagram(initialEventData.socialMediaHandles?.instagram || '');
    setFacebook(initialEventData.socialMediaHandles?.facebook || '');
    setErrors({}); // Clear errors when data changes
  }, [params.eventData, params.posterImageUri]);

  // Check if form is valid without setting errors (for button state)
  const checkFormValid = (): boolean => {
    const titleError = validateTitle(title);
    if (titleError) return false;

    const datesError = validateDates(selectedDates);
    if (datesError) return false;

    const costError = validatePrice(cost);
    if (costError) return false;

    const urlError = validateURL(websiteUrl);
    if (urlError) return false;

    const descError = validateDescription(description);
    if (descError) return false;

    const orgError = validateOrganizationName(organizationName);
    if (orgError) return false;

    const xError = validateSocialHandle(x, 'X');
    if (xError) return false;

    const instagramError = validateSocialHandle(instagram, 'Instagram');
    if (instagramError) return false;

    const facebookError = validateSocialHandle(facebook, 'Facebook');
    if (facebookError) return false;

    return true;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    const titleError = validateTitle(title);
    if (titleError) newErrors.title = titleError;

    const datesError = validateDates(selectedDates);
    if (datesError) newErrors.date = datesError;

    const addressError = address.trim() ? undefined : undefined; // Address is optional
    // Could add address format validation here

    const costError = validatePrice(cost);
    if (costError) newErrors.cost = costError;

    const urlError = validateURL(websiteUrl);
    if (urlError) newErrors.websiteUrl = urlError;

    const descError = validateDescription(description);
    if (descError) newErrors.description = descError;

    const orgError = validateOrganizationName(organizationName);
    if (orgError) newErrors.organizationName = orgError;

    const xError = validateSocialHandle(x, 'X');
    if (xError) newErrors.x = xError;

    const instagramError = validateSocialHandle(instagram, 'Instagram');
    if (instagramError) newErrors.instagram = instagramError;

    const facebookError = validateSocialHandle(facebook, 'Facebook');
    if (facebookError) newErrors.facebook = facebookError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Validate form before submission
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form before submitting.');
      return;
    }

    if (selectedDates.length === 0) {
      Alert.alert('Error', 'Please select at least one event date');
      return;
    }

    setIsSaving(true);

    try {
      // Combine dates and times into EventDate format
      const dates: EventDate[] = selectedDates.map(date => {
        const eventDate = new Date(date);
        
        // Set start time if provided
        if (startTime) {
          eventDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        } else {
          // Date-only event, use UTC midnight
          eventDate.setHours(0, 0, 0, 0);
        }
        
        const eventDateItem: EventDate = {
          start: eventDate.toISOString(),
        };
        
        // Add end time if provided
        if (endTime) {
          const endDate = new Date(date);
          endDate.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
          eventDateItem.end = endDate.toISOString();
        }
        
        return eventDateItem;
      });

      // Parse price to number - if isFree is true, always set to 0, otherwise parse the cost string
      let price: number | null;
      if (isFree) {
        price = 0; // Free events always save as 0
      } else {
        price = parsePriceToNumber(cost.trim() || undefined);
      }

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
  const errorColor = '#EF4444';

  // Check if form is valid for submit button state
  // Use checkFormValid to ensure button state updates when errors are fixed
  const isFormValid = title.trim() && selectedDates.length > 0 && checkFormValid();

  // Helper functions for managing dates
  const addDate = () => {
    // Default new date to previous date + 1 day, or today if no dates exist
    let newDate: Date;
    if (selectedDates.length > 0) {
      const lastDate = selectedDates[selectedDates.length - 1];
      newDate = new Date(lastDate);
      newDate.setDate(newDate.getDate() + 1);
    } else {
      newDate = new Date();
    }
    setSelectedDates([...selectedDates, newDate]);
    setEditingDateIndex(selectedDates.length); // Set to the new date's index
    setIsDatePickerOpen(true);
  };

  const removeDate = (index: number) => {
    if (selectedDates.length > 1) {
      setSelectedDates(selectedDates.filter((_, i) => i !== index));
    }
  };

  const updateDate = (index: number, newDate: Date) => {
    const updatedDates = [...selectedDates];
    updatedDates[index] = newDate;
    setSelectedDates(updatedDates);
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

          {/* Form Fields */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 20 }}>
            {/* Title Field */}
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
                Event Title *
              </Text>
              <Host matchContents>
                <TextField
                  defaultValue={title}
                  onChangeText={(text) => {
                    setTitle(text);
                    // Clear error when user starts typing
                    if (errors.title) {
                      setErrors(prev => ({ ...prev, title: undefined }));
                    }
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

            {/* Date and Time Fields */}
            <GlassView
              style={{
                borderRadius: 20,
                padding: 20,
                overflow: 'hidden',
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
                  Event Dates *
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    addDate();
                  }}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: tintColor,
                  }}
                >
                  <Ionicons name="add" size={16} color={Colors[colorScheme].text} />
                </TouchableOpacity>
              </View>
              
              {selectedDates.map((date, index) => (
                <View key={index} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.selectionAsync();
                        setEditingDateIndex(index);
                        setIsDatePickerOpen(true);
                      }}
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderRadius: 12,
                        backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                        borderWidth: errors.date ? 1 : 0,
                        borderColor: errorColor,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{
                          color: textColor,
                          fontSize: 16,
                          fontWeight: '500',
                        }}>
                          {formatDateOnly(date)}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color={textColor} style={{ opacity: 0.7 }} />
                      </View>
                    </TouchableOpacity>
                    {selectedDates.length > 1 && (
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          removeDate(index);
                        }}
                        activeOpacity={0.7}
                        style={{
                          padding: 8,
                          borderRadius: 8,
                          backgroundColor: colorScheme === 'dark' ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 0, 0, 0.1)',
                        }}
                      >
                        <Ionicons name="close" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              
              {errors.date && (
                <Text style={{
                  color: errorColor,
                  fontSize: 12,
                  marginTop: 8,
                }}>
                  {errors.date}
                </Text>
              )}

              <Text style={{
                color: textColor,
                fontSize: 14,
                fontWeight: '600',
                marginTop: 20,
                marginBottom: 12,
                opacity: 0.7,
              }}>
                Event Times (Optional)
              </Text>
              
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIsEditingStartTime(true);
                    setIsTimePickerOpen(true);
                  }}
                  activeOpacity={0.7}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    borderWidth: errors.time ? 1 : 0,
                    borderColor: errorColor,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{
                        color: textColor,
                        fontSize: 12,
                        opacity: 0.7,
                        marginBottom: 4,
                      }}>
                        Start Time
                      </Text>
                      <Text style={{
                        color: startTime ? textColor : placeholderColor,
                        fontSize: 16,
                        fontWeight: startTime ? '500' : '400',
                      }}>
                        {startTime ? formatTime(startTime) : 'Select start time'}
                      </Text>
                    </View>
                    <Ionicons name="time-outline" size={20} color={textColor} style={{ opacity: 0.7 }} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIsEditingEndTime(true);
                    setIsTimePickerOpen(true);
                  }}
                  activeOpacity={0.7}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{
                        color: textColor,
                        fontSize: 12,
                        opacity: 0.7,
                        marginBottom: 4,
                      }}>
                        End Time
                      </Text>
                      <Text style={{
                        color: endTime ? textColor : placeholderColor,
                        fontSize: 16,
                        fontWeight: endTime ? '500' : '400',
                      }}>
                        {endTime ? formatTime(endTime) : 'Select end time'}
                      </Text>
                    </View>
                    <Ionicons name="time-outline" size={20} color={textColor} style={{ opacity: 0.7 }} />
                  </View>
                </TouchableOpacity>
              </View>
              
              {errors.time && (
                <Text style={{
                  color: errorColor,
                  fontSize: 12,
                  marginTop: 8,
                }}>
                  {errors.time}
                </Text>
              )}
            </GlassView>

            {/* Location Field */}
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
              <Host matchContents>
                <TextField
                  defaultValue={address}
                  onChangeText={(text) => {
                    setAddress(text);
                    if (errors.address) {
                      setErrors(prev => ({ ...prev, address: undefined }));
                    }
                  }}
                  placeholder="Enter event location or address"
                  multiline
                />
              </Host>
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
                        if (errors.cost) {
                          setErrors(prev => ({ ...prev, cost: undefined }));
                        }
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
                      if (errors.cost) {
                        setErrors(prev => ({ ...prev, cost: undefined }));
                      }
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
                    if (errors.websiteUrl) {
                      setErrors(prev => ({ ...prev, websiteUrl: undefined }));
                    }
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
                    if (errors.organizationName) {
                      setErrors(prev => ({ ...prev, organizationName: undefined }));
                    }
                  }}
                  placeholder="Organization or host name"
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
                    if (errors.description) {
                      setErrors(prev => ({ ...prev, description: undefined }));
                    }
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
                {/* X/Twitter */}
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <XSymbol size={16} color={textColor} />
                    <Text style={{
                      color: textColor,
                      fontSize: 12,
                      opacity: 0.7,
                    }}>
                      X (Twitter)
                    </Text>
                  </View>
                  <Host matchContents>
                    <TextField
                      defaultValue={x}
                      onChangeText={(text) => {
                        setX(text);
                        if (errors.x) {
                          setErrors(prev => ({ ...prev, x: undefined }));
                        }
                      }}
                      placeholder="@username"
                      autocorrection={false}
                    />
                  </Host>
                  {errors.x && (
                    <Text style={{
                      color: errorColor,
                      fontSize: 12,
                      marginTop: 4,
                    }}>
                      {errors.x}
                    </Text>
                  )}
                </View>

                {/* Instagram */}
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Ionicons name="logo-instagram" size={16} color="#E4405F" />
                    <Text style={{
                      color: textColor,
                      fontSize: 12,
                      opacity: 0.7,
                    }}>
                      Instagram
                    </Text>
                  </View>
                  <Host matchContents>
                    <TextField
                      defaultValue={instagram}
                      onChangeText={(text) => {
                        setInstagram(text);
                        if (errors.instagram) {
                          setErrors(prev => ({ ...prev, instagram: undefined }));
                        }
                      }}
                      placeholder="@username"
                      autocorrection={false}
                    />
                  </Host>
                  {errors.instagram && (
                    <Text style={{
                      color: errorColor,
                      fontSize: 12,
                      marginTop: 4,
                    }}>
                      {errors.instagram}
                    </Text>
                  )}
                </View>

                {/* Facebook */}
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Ionicons name="logo-facebook" size={16} color="#1877F2" />
                    <Text style={{
                      color: textColor,
                      fontSize: 12,
                      opacity: 0.7,
                    }}>
                      Facebook
                    </Text>
                  </View>
                  <Host matchContents>
                    <TextField
                      defaultValue={facebook}
                      onChangeText={(text) => {
                        setFacebook(text);
                        if (errors.facebook) {
                          setErrors(prev => ({ ...prev, facebook: undefined }));
                        }
                      }}
                      placeholder="username"
                      autocorrection={false}
                    />
                  </Host>
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
              </View>
            </GlassView>
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
      </KeyboardAvoidingView>

      {/* Date Picker Bottom Sheet */}
      {isDatePickerOpen && editingDateIndex !== null && (
        <Host style={{ position: 'absolute', width, height, zIndex: 1000, pointerEvents: 'box-none' }}>
          <BottomSheet
            isPresented={isDatePickerOpen}
            onIsPresentedChange={(isOpen: boolean) => {
              setIsDatePickerOpen(isOpen);
              if (!isOpen) setEditingDateIndex(null);
            }}
            fitToContents
          >
            <View style={{
              paddingTop: 20,
              paddingBottom: insets.bottom + 20,
              paddingHorizontal: 20,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              minHeight: height * 0.45,
            }}>
              <View 
                style={{
                  marginBottom: 20,
                }}
              >
                <Text style={{
                  color: textColor,
                  fontSize: 18,
                  fontWeight: '700',
                }}>
                  Select Date {selectedDates.length > 1 ? `(${editingDateIndex! + 1})` : ''}
                </Text>
              </View>
              <Host style={{ minHeight: 200 }}>
                <DatePicker
                  displayedComponents={["date"]}
                  selection={selectedDates[editingDateIndex!] || new Date()}
                  onDateChange={(date: Date) => {
                    updateDate(editingDateIndex!, date);
                    // Clear error when user selects date
                    if (errors.date) {
                      setErrors(prev => ({ ...prev, date: undefined }));
                    }
                  }}
                />
              </Host>
            </View>
          </BottomSheet>
        </Host>
      )}

      {/* Time Picker Bottom Sheet */}
      {isTimePickerOpen && (isEditingStartTime || isEditingEndTime) && (
        <Host style={{ position: 'absolute', width, height, zIndex: 1000, pointerEvents: 'box-none' }}>
          <BottomSheet
            isPresented={isTimePickerOpen}
            onIsPresentedChange={(isOpen: boolean) => {
              setIsTimePickerOpen(isOpen);
              if (!isOpen) {
                setIsEditingStartTime(false);
                setIsEditingEndTime(false);
              }
            }}
            fitToContents
          >
            <View style={{
              paddingTop: 20,
              paddingBottom: insets.bottom + 20,
              paddingHorizontal: 20,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              minHeight: height * 0.4,
            }}>
              <View 
                style={{
                  marginBottom: 20,
                }}
              >
                <Text style={{
                  color: textColor,
                  fontSize: 18,
                  fontWeight: '700',
                }}>
                  Select {isEditingStartTime ? 'Start' : 'End'} Time
                </Text>
              </View>
              <Host style={{ minHeight: 200 }}>
                <DatePicker
                  displayedComponents={["hourAndMinute"]}
                  selection={(isEditingStartTime ? startTime : endTime) || new Date()}
                  onDateChange={(date: Date) => {
                    if (isEditingStartTime) {
                      setStartTime(date);
                    } else {
                      setEndTime(date);
                    }
                    // Clear error when user selects time
                    if (errors.time) {
                      setErrors(prev => ({ ...prev, time: undefined }));
                    }
                  }}
                />
              </Host>
            </View>
          </BottomSheet>
        </Host>
      )}
    </SafeAreaView>
  );
}
