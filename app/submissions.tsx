import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { Event, useEvents } from '../contexts/EventContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import * as submissionService from '../services/submissionService';
import { formatEventDates } from '../utils/dateFormatter';

export default function SubmissionsScreen() {
  const { colorScheme } = useTheme();
  const { user } = useUser();
  const router = useRouter();
  const { refreshEvents } = useEvents();
  const backgroundColor = Colors[colorScheme].background;
  const textColor = Colors[colorScheme].text;
  const tintColor = Colors[colorScheme].tint;

  const [submissions, setSubmissions] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = async () => {
    if (!user) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const fetchedSubmissions = await submissionService.getUserSubmissions(user.id);
      setSubmissions(fetchedSubmissions);
    } catch (err) {
      console.error('[SubmissionsScreen] Error loading submissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubmissions();
    // Keep app state consistent (e.g., home tab list refresh).
    await refreshEvents();
  };

  const isEventPast = (event: Event): boolean => {
    if (!event.dates || event.dates.length === 0) {
      return false;
    }

    const now = new Date();
    // Check if all dates have passed
    return event.dates.every((date) => {
      const eventDate = new Date(date.end || date.start);
      return eventDate < now;
    });
  };

  const handleEventPress = (event: Event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/event/${event.id}`);
  };

  // Separate events into upcoming and past
  const upcomingEvents = submissions.filter((event) => !isEventPast(event));
  const pastEvents = submissions.filter((event) => isEventPast(event));

  const renderSubmissionItem = ({ item }: { item: Event }) => {
    const thumbnailSize = 80;
    const thumbnailHeight = (thumbnailSize * 3) / 2; // Maintain 2:3 aspect ratio

    return (
      <TouchableOpacity
        onPress={() => handleEventPress(item)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          padding: 16,
          backgroundColor: backgroundColor,
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' ? '#333' : '#E5E7EB',
        }}
      >
        {/* Thumbnail */}
        <View
          style={{
            width: thumbnailSize,
            height: thumbnailHeight,
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: colorScheme === 'dark' ? '#1F1F1F' : '#E5E7EB',
            marginRight: 12,
          }}
        >
          {item.posterImage ? (
            <Image
              source={{ uri: item.posterImage }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="image-outline" size={24} color={textColor} style={{ opacity: 0.3 }} />
            </View>
          )}
        </View>

        {/* Title and Date */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text
            style={{
              color: textColor,
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {item.title || 'Event'}
          </Text>
          {item.dates && item.dates.length > 0 && (
            <Text
              style={{
                color: textColor,
                fontSize: 14,
                opacity: 0.7,
              }}
            >
              {formatEventDates(item.dates)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string) => (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 8,
        backgroundColor: backgroundColor,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontSize: 18,
          fontWeight: '700',
          opacity: 0.8,
        }}
      >
        {title}
      </Text>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={tintColor} />
          <Text style={{ color: textColor, marginTop: 16, fontSize: 16 }}>
            Loading submissions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={64} color={textColor} style={{ opacity: 0.5 }} />
          <Text style={{ color: textColor, marginTop: 16, fontSize: 16, textAlign: 'center' }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={loadSubmissions}
            style={{
              marginTop: 16,
              backgroundColor: tintColor,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: Colors[colorScheme].background, fontWeight: '600' }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="pin-outline" size={64} color={textColor} style={{ opacity: 0.5 }} />
          <Text style={{ color: textColor, marginTop: 16, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
            Sign in to view your submissions
          </Text>
          <Text style={{ color: textColor, marginTop: 8, fontSize: 14, opacity: 0.7, textAlign: 'center' }}>
            Sign in to create events and see them here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (submissions.length === 0) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="pin-outline" size={64} color={textColor} style={{ opacity: 0.5 }} />
          <Text style={{ color: textColor, marginTop: 16, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
            No submissions yet
          </Text>
          <Text style={{ color: textColor, marginTop: 8, fontSize: 14, opacity: 0.7, textAlign: 'center', maxWidth: 300 }}>
            Add an event from the Add tab to see it show up here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Build data array with section headers
  const data: Array<{ type: 'header' | 'event'; title?: string; event?: Event }> = [];

  if (upcomingEvents.length > 0) {
    // Only add header if there are both upcoming and past events
    if (pastEvents.length > 0) {
      data.push({ type: 'header', title: 'Upcoming Events' });
    }
    upcomingEvents.forEach((event) => {
      data.push({ type: 'event', event });
    });
  }

  if (pastEvents.length > 0) {
    data.push({ type: 'header', title: 'Past Events' });
    pastEvents.forEach((event) => {
      data.push({ type: 'event', event });
    });
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor }}>
      <FlatList
        data={data}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return renderSectionHeader(item.title || '');
          }
          return item.event ? renderSubmissionItem({ item: item.event }) : null;
        }}
        keyExtractor={(item, index) => {
          if (item.type === 'header') {
            return `header-${item.title}-${index}`;
          }
          return `event-${item.event?.id}-${index}`;
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tintColor} />
        }
        style={{ backgroundColor }}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </SafeAreaView>
  );
}

