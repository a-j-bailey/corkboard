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
import { formatEventDate, formatEventTime } from '../../utils/dateFormatter';
import { XSymbol } from '../../components/XSymbol';

export default function PreviewScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { addEvent } = useEvents();
  const { colorScheme } = useTheme();
  const backgroundColor = Colors[colorScheme].background;
  const textColor = Colors[colorScheme].text;
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
  const [x, setX] = useState(initialEventData.socialMediaHandles?.x || '');
  const [instagram, setInstagram] = useState(initialEventData.socialMediaHandles?.instagram || '');
  const [facebook, setFacebook] = useState(initialEventData.socialMediaHandles?.facebook || '');

  // Update state when params change
  useEffect(() => {
    setTitle(initialEventData.title || '');
    setDate(initialEventData.date || '');
    setTime(initialEventData.time || '');
    setAddress(initialEventData.address || '');
    setCost(initialEventData.cost || '');
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
      const socialMediaHandles: SocialMediaHandles = {};
      if (x.trim()) socialMediaHandles.x = x.trim();
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

      addEvent(eventToSave);
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

          {/* Date and Time - Centered */}
          {(date || time) && (
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
                {[
                  date ? formatEventDate(date) : '',
                  time ? formatEventTime(time) : ''
                ].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}

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
            </View>
          )}
        </View>

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
              <ActivityIndicator color={textColor} />
            ) : (
              <Text style={{ color: textColor, fontSize: 16, fontWeight: '600' }}>
                Submit
              </Text>
            )}
          </GlassView>
        </TouchableOpacity>
      </View>
    </View>
  );
}
