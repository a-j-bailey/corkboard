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
import { Event, SocialMediaHandles, useEvents } from '../../contexts/EventContext';

export default function PreviewScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { addEvent } = useEvents();
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

  const [title, setTitle] = useState(initialEventData.title || '');
  const [date, setDate] = useState(initialEventData.date || '');
  const [time, setTime] = useState(initialEventData.time || '');
  const [address, setAddress] = useState(initialEventData.address || '');
  const [cost, setCost] = useState(initialEventData.cost || '');
  const [websiteUrl, setWebsiteUrl] = useState(initialEventData.websiteUrl || '');
  const [description, setDescription] = useState(initialEventData.description || '');
  const [organizationName, setOrganizationName] = useState(initialEventData.organizationName || '');
  const [twitter, setTwitter] = useState(initialEventData.socialMediaHandles?.twitter || '');
  const [instagram, setInstagram] = useState(initialEventData.socialMediaHandles?.instagram || '');
  const [facebook, setFacebook] = useState(initialEventData.socialMediaHandles?.facebook || '');

  // Update state when params change
  useEffect(() => {
    console.log('[PreviewScreen] Screen loaded');
    console.log('[PreviewScreen] Event data:', JSON.stringify(initialEventData, null, 2));
    console.log('[PreviewScreen] Poster image URI:', posterImageUri);
    
    setTitle(initialEventData.title || '');
    setDate(initialEventData.date || '');
    setTime(initialEventData.time || '');
    setAddress(initialEventData.address || '');
    setCost(initialEventData.cost || '');
    setWebsiteUrl(initialEventData.websiteUrl || '');
    setDescription(initialEventData.description || '');
    setOrganizationName(initialEventData.organizationName || '');
    setTwitter(initialEventData.socialMediaHandles?.twitter || '');
    setInstagram(initialEventData.socialMediaHandles?.instagram || '');
    setFacebook(initialEventData.socialMediaHandles?.facebook || '');
  }, [params.eventData, params.posterImageUri]);

  const handleSave = async () => {
    console.log('[PreviewScreen] Save button pressed');
    
    if (!title.trim()) {
      console.warn('[PreviewScreen] Validation failed: title is required');
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (!date.trim()) {
      console.warn('[PreviewScreen] Validation failed: date is required');
      Alert.alert('Error', 'Please enter an event date');
      return;
    }

    console.log('[PreviewScreen] Validation passed, saving event...');
    setIsSaving(true);

    try {
      const socialMediaHandles: SocialMediaHandles = {};
      if (twitter.trim()) socialMediaHandles.twitter = twitter.trim();
      if (instagram.trim()) socialMediaHandles.instagram = instagram.trim();
      if (facebook.trim()) socialMediaHandles.facebook = facebook.trim();

      const eventToSave: Omit<Event, 'id' | 'createdAt'> = {
        title: title.trim(),
        date: date.trim(),
        time: time.trim() || undefined,
        address: address.trim() || undefined,
        cost: cost.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        description: description.trim() || undefined,
        organizationName: organizationName.trim() || undefined,
        socialMediaHandles: Object.keys(socialMediaHandles).length > 0 ? socialMediaHandles : undefined,
        posterImage: posterImageUri || initialEventData.posterImage || '',
      };

      console.log('[PreviewScreen] Event data to save:', JSON.stringify(eventToSave, null, 2));
      addEvent(eventToSave);
      console.log('[PreviewScreen] Event saved successfully');
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

  return (
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
        <TouchableOpacity onPress={() => router.back()} disabled={isSaving}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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

          {/* Date and Time */}
          {(date || time) && (
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
          )}

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
          {(twitter || instagram || facebook) && (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 16,
              marginBottom: 20,
            }}>
              {twitter && (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
                  <TextInput
                    style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                    }}
                    value={twitter}
                    onChangeText={setTwitter}
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
}

