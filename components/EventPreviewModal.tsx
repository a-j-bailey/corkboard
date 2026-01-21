import { BottomSheet, Host } from '@expo/ui/swift-ui';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Event, SocialMediaHandles, useEvents } from '../contexts/EventContext';
import { parseDates, parsePriceToNumber } from '../services/eventParser';
import { geocodeLocation } from '../services/geocodingService';
import { formatDateOnly, formatTime } from '../utils/dateFormatter';
import { XSymbol } from './XSymbol';

interface EventPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  eventData: Partial<Event>;
  posterImageUri?: string;
}

export default function EventPreviewModal({
  visible,
  onClose,
  eventData,
  posterImageUri,
}: EventPreviewModalProps) {
  const { addEvent } = useEvents();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  
  const [title, setTitle] = useState(eventData.title || '');
  const [date, setDate] = useState(eventData.date || '');
  const [time, setTime] = useState(eventData.time || '');
  const [address, setAddress] = useState(eventData.address || '');
  const [cost, setCost] = useState(eventData.cost || '');
  const [websiteUrl, setWebsiteUrl] = useState(eventData.websiteUrl || '');
  const [description, setDescription] = useState(eventData.description || '');
  const [organizationName, setOrganizationName] = useState(eventData.organizationName || '');
  const [x, setX] = useState(eventData.socialMediaHandles?.x || '');
  const [instagram, setInstagram] = useState(eventData.socialMediaHandles?.instagram || '');
  const [facebook, setFacebook] = useState(eventData.socialMediaHandles?.facebook || '');

  // Sync bottom sheet with visible prop
  useEffect(() => {
    console.log('[EventPreviewModal] Visibility changed:', visible);
    setIsBottomSheetOpen(visible);
    if (visible) {
      console.log('[EventPreviewModal] Modal opened with event data:', JSON.stringify(eventData, null, 2));
    }
  }, [visible, eventData]);

  // Update form fields when eventData changes
  useEffect(() => {
    console.log('[EventPreviewModal] Event data updated:', JSON.stringify(eventData, null, 2));
    console.log('[EventPreviewModal] Poster image URI:', posterImageUri);
    
    const newTitle = eventData.title || '';
    
    // Handle both old format (date/time) and new format (dates)
    let newDate = '';
    let newTime = '';
    if (eventData.dates && eventData.dates.length > 0) {
      // New format: extract first date
      const firstDate = new Date(eventData.dates[0].start);
      newDate = firstDate.toISOString().split('T')[0];
      if (firstDate.getHours() !== 0 || firstDate.getMinutes() !== 0) {
        const hours = firstDate.getHours();
        const minutes = firstDate.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        newTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      }
    } else {
      // Old format: use date and time directly
      newDate = (eventData as any).date || '';
      newTime = (eventData as any).time || '';
    }
    
    // Handle both old format (cost) and new format (price)
    let newCost = '';
    if (eventData.price !== null && eventData.price !== undefined) {
      if (eventData.price === 0) {
        newCost = 'Free';
      } else {
        newCost = `$${eventData.price}`;
      }
    } else {
      newCost = (eventData as any).cost || '';
    }
    
    const newAddress = eventData.address || '';
    const newWebsiteUrl = eventData.websiteUrl || '';
    const newDescription = eventData.description || '';
    const newOrganizationName = eventData.organizationName || '';
    const newX = eventData.socialMediaHandles?.x || '';
    const newInstagram = eventData.socialMediaHandles?.instagram || '';
    const newFacebook = eventData.socialMediaHandles?.facebook || '';
    
    console.log('[EventPreviewModal] Updating form fields:');
    console.log('  - Title:', newTitle || '(empty)');
    console.log('  - Date:', newDate || '(empty)');
    console.log('  - Time:', newTime || '(empty)');
    console.log('  - Address:', newAddress || '(empty)');
    console.log('  - Cost:', newCost || '(empty)');
    console.log('  - Website URL:', newWebsiteUrl || '(empty)');
    console.log('  - Description:', newDescription ? `${newDescription.substring(0, 50)}...` : '(empty)');
    console.log('  - Organization:', newOrganizationName || '(empty)');
    console.log('  - X:', newX || '(empty)');
    console.log('  - Instagram:', newInstagram || '(empty)');
    console.log('  - Facebook:', newFacebook || '(empty)');
    
    setTitle(newTitle);
    setDate(newDate);
    setTime(newTime);
    setAddress(newAddress);
    setCost(newCost);
    setWebsiteUrl(newWebsiteUrl);
    setDescription(newDescription);
    setOrganizationName(newOrganizationName);
    setX(newX);
    setInstagram(newInstagram);
    setFacebook(newFacebook);
  }, [eventData, posterImageUri]);

  const handleBottomSheetClose = (isOpen: boolean) => {
    console.log('[EventPreviewModal] Bottom sheet state changed:', isOpen);
    setIsBottomSheetOpen(isOpen);
    if (!isOpen) {
      console.log('[EventPreviewModal] Modal closed');
      onClose();
    }
  };

  const handleSave = async () => {
    console.log('[EventPreviewModal] Save button pressed');
    
    if (!title.trim()) {
      console.warn('[EventPreviewModal] Validation failed: title is required');
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (!date.trim()) {
      console.warn('[EventPreviewModal] Validation failed: date is required');
      Alert.alert('Error', 'Please enter an event date');
      return;
    }

    console.log('[EventPreviewModal] Validation passed, saving event...');
    setIsSaving(true);

    try {
      const socialMediaHandles: SocialMediaHandles = {};
      if (x.trim()) socialMediaHandles.x = x.trim();
      if (instagram.trim()) socialMediaHandles.instagram = instagram.trim();
      if (facebook.trim()) socialMediaHandles.facebook = facebook.trim();

      // Parse dates and price
      const dates = parseDates(date.trim(), time.trim() || undefined);
      if (dates.length === 0) {
        Alert.alert('Error', 'Could not parse event date. Please check the format.');
        setIsSaving(false);
        return;
      }

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
          console.warn('[EventPreviewModal] Geocoding failed, saving without coordinates:', geocodeError);
        }
      }

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

      console.log('[EventPreviewModal] Event data to save:', JSON.stringify(eventToSave, null, 2));
      await addEvent(eventToSave, posterImageUri || eventData.posterImage);
      console.log('[EventPreviewModal] Event saved successfully');
      Alert.alert('Success', 'Event saved successfully!');
      setIsBottomSheetOpen(false);
      onClose();
    } catch (error) {
      console.error('[EventPreviewModal] Error saving event:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate image dimensions for 2:3 aspect ratio
  const imagePadding = 20;
  const availableWidth = width - (imagePadding * 2);
  const imageWidth = availableWidth;
  const imageHeight = (imageWidth * 3) / 2; // 2:3 aspect ratio

  const renderContent = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      }}>
        <TouchableOpacity onPress={onClose} disabled={isSaving}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}>
          Preview Event
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Poster Image - 2:3 aspect ratio, centered with padding */}
        {posterImageUri && (
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
              backgroundColor: '#1F1F1F',
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
        <View style={{ paddingHorizontal: 20 }}>
          {/* Title */}
          {title ? (
            <View style={{ marginBottom: 20 }}>
              <TextInput
                style={{
                  color: '#FFFFFF',
                  fontSize: 28,
                  fontWeight: '700',
                  textAlign: 'center',
                  paddingVertical: 8,
                }}
                value={title}
                onChangeText={setTitle}
                placeholder="Event Title"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                editable={!isSaving}
                multiline
              />
            </View>
          ) : (
            <View style={{ marginBottom: 20 }}>
              <TextInput
                style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: 28,
                  fontWeight: '700',
                  textAlign: 'center',
                  paddingVertical: 8,
                }}
                value=""
                onChangeText={setTitle}
                placeholder="Event Title *"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                editable={!isSaving}
                multiline
              />
            </View>
          )}

          {/* Parse dates to check if multiple */}
          {(() => {
            const parsedDates = parseDates(date || '', time || undefined);
            const hasMultipleDates = parsedDates.length > 1;
            
            // Show multiple dates in a card
            if (hasMultipleDates) {
              return (
                <View style={{ marginBottom: 20 }}>
                  <GlassView
                    style={{
                      borderRadius: 20,
                      padding: 20,
                      overflow: 'hidden',
                    }}
                    glassEffectStyle="regular"
                  >
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: '600',
                      marginBottom: 12,
                      opacity: 0.7,
                    }}>
                      Event Dates
                    </Text>
                    <View style={{ gap: 8 }}>
                      {parsedDates.map((dateItem, index) => {
                        const dateObj = new Date(dateItem.start);
                        const isDateOnly = dateObj.getUTCHours() === 0 && dateObj.getUTCMinutes() === 0;
                        
                        return (
                          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{
                              color: '#FFFFFF',
                              fontSize: 16,
                              fontWeight: '500',
                              flex: 1,
                            }}>
                              {formatDateOnly(dateObj)}
                            </Text>
                            {!isDateOnly && (
                              <Text style={{
                                color: '#FFFFFF',
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
            
            // Single date - show as editable inputs
            return (date || time) ? (
              <View style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                gap: 12,
              }}>
                {date && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
                    <TextInput
                      style={{
                        color: '#FFFFFF',
                        fontSize: 16,
                        fontWeight: '500',
                      }}
                      value={date}
                      onChangeText={setDate}
                      placeholder="Date"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      editable={!isSaving}
                    />
                  </View>
                )}
                {time && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="time-outline" size={18} color="#FFFFFF" />
                    <TextInput
                      style={{
                        color: '#FFFFFF',
                        fontSize: 16,
                        fontWeight: '500',
                      }}
                      value={time}
                      onChangeText={setTime}
                      placeholder="Time"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      editable={!isSaving}
                    />
                  </View>
                )}
              </View>
            ) : null;
          })()}

          {/* Location */}
          {address && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginBottom: 16,
              gap: 8,
            }}>
              <Ionicons name="location-outline" size={18} color="#FFFFFF" style={{ marginTop: 2 }} />
              <TextInput
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  flex: 1,
                }}
                value={address}
                onChangeText={setAddress}
                placeholder="Location"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                editable={!isSaving}
                multiline
              />
            </View>
          )}

          {/* Cost */}
          {cost && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
              gap: 8,
            }}>
              <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
              <TextInput
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '500',
                }}
                value={cost}
                onChangeText={setCost}
                placeholder="Cost"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                editable={!isSaving}
              />
            </View>
          )}

          {/* Organization */}
          {organizationName && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
              gap: 8,
            }}>
              <Ionicons name="business-outline" size={18} color="#FFFFFF" />
              <TextInput
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                }}
                value={organizationName}
                onChangeText={setOrganizationName}
                placeholder="Organization"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                editable={!isSaving}
              />
            </View>
          )}

          {/* Description */}
          {description && (
            <View style={{ marginBottom: 20 }}>
              <TextInput
                style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  lineHeight: 22,
                  textAlign: 'center',
                }}
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                editable={!isSaving}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Website URL */}
          {websiteUrl && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              gap: 8,
            }}>
              <Ionicons name="link-outline" size={18} color="#FFFFFF" />
              <TextInput
                style={{
                  color: '#3B82F6',
                  fontSize: 15,
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

          {/* Social Media Handles */}
          {(x || instagram || facebook) && (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 16,
              marginBottom: 20,
            }}>
              {x && (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <XSymbol size={20} color="#FFFFFF" />
                  <TextInput
                    style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                    }}
                    value={x}
                    onChangeText={setX}
                    placeholder="@username"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    editable={!isSaving}
                    autoCapitalize="none"
                  />
                </View>
              )}
              {instagram && (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                  <TextInput
                    style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                    }}
                    value={instagram}
                    onChangeText={setInstagram}
                    placeholder="@username"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    editable={!isSaving}
                    autoCapitalize="none"
                  />
                </View>
              )}
              {facebook && (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                  <TextInput
                    style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                    }}
                    value={facebook}
                    onChangeText={setFacebook}
                    placeholder="Page name"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    editable={!isSaving}
                  />
                </View>
              )}
            </View>
          )}

          {/* Required fields if missing */}
          {!date && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 14, marginBottom: 8 }}>
                Date *
              </Text>
              <TextInput
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255, 255, 255, 0.2)',
                  paddingVertical: 8,
                }}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                editable={!isSaving}
              />
            </View>
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
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                Submit
              </Text>
            )}
          </GlassView>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
