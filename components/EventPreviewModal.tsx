import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Event, SocialMediaHandles, useEvents } from '../contexts/EventContext';

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
  const [isSaving, setIsSaving] = useState(false);
  
  const [title, setTitle] = useState(eventData.title || '');
  const [date, setDate] = useState(eventData.date || '');
  const [time, setTime] = useState(eventData.time || '');
  const [address, setAddress] = useState(eventData.address || '');
  const [cost, setCost] = useState(eventData.cost || '');
  const [websiteUrl, setWebsiteUrl] = useState(eventData.websiteUrl || '');
  const [description, setDescription] = useState(eventData.description || '');
  const [organizationName, setOrganizationName] = useState(eventData.organizationName || '');
  const [twitter, setTwitter] = useState(eventData.socialMediaHandles?.twitter || '');
  const [instagram, setInstagram] = useState(eventData.socialMediaHandles?.instagram || '');
  const [facebook, setFacebook] = useState(eventData.socialMediaHandles?.facebook || '');

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
        thumbnailImage: posterImageUri || eventData.thumbnailImage || '',
        posterImage: posterImageUri || eventData.posterImage || '',
      };

      addEvent(eventToSave);
      Alert.alert('Success', 'Event saved successfully!');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save event. Please try again.');
      console.error('Error saving event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white dark:bg-black">
        <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <TouchableOpacity onPress={onClose} disabled={isSaving}>
            <Text className="text-blue-500 dark:text-blue-400 text-lg font-medium">
              Cancel
            </Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Preview Event
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Poster Image Preview */}
          {posterImageUri && (
            <View className="w-full h-64 rounded-lg overflow-hidden mb-6 bg-gray-200 dark:bg-gray-800">
              <Image
                source={{ uri: posterImageUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
          )}

          {/* Form Fields */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="Event title"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              editable={!isSaving}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Date *
            </Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              value={date}
              onChangeText={setDate}
              editable={!isSaving}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Time
            </Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="e.g., 2:00 PM - 10:00 PM"
              placeholderTextColor="#9CA3AF"
              value={time}
              onChangeText={setTime}
              editable={!isSaving}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Address
            </Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="Event address"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
              editable={!isSaving}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Cost
            </Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="e.g., $45 or Free"
              placeholderTextColor="#9CA3AF"
              value={cost}
              onChangeText={setCost}
              editable={!isSaving}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Website URL
            </Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="https://example.com"
              placeholderTextColor="#9CA3AF"
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              keyboardType="url"
              autoCapitalize="none"
              editable={!isSaving}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Organization Name
            </Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="Organization name"
              placeholderTextColor="#9CA3AF"
              value={organizationName}
              onChangeText={setOrganizationName}
              editable={!isSaving}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description
            </Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              placeholder="Event description"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSaving}
            />
          </View>

          {/* Social Media Handles */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Social Media Handles
            </Text>
            <View className="mb-2">
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white mb-2"
                placeholder="Twitter handle (e.g., @username)"
                placeholderTextColor="#9CA3AF"
                value={twitter}
                onChangeText={setTwitter}
                autoCapitalize="none"
                editable={!isSaving}
              />
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white mb-2"
                placeholder="Instagram handle (e.g., @username)"
                placeholderTextColor="#9CA3AF"
                value={instagram}
                onChangeText={setInstagram}
                autoCapitalize="none"
                editable={!isSaving}
              />
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
                placeholder="Facebook page name"
                placeholderTextColor="#9CA3AF"
                value={facebook}
                onChangeText={setFacebook}
                editable={!isSaving}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            className="bg-blue-500 dark:bg-blue-600 px-8 py-4 rounded-lg mt-4"
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-lg">
                Save Event
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
