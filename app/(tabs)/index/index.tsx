import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, RefreshControl, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/theme';
import { DistanceFilter, Event, useEvents } from '../../../contexts/EventContext';
import { useTheme } from '../../../contexts/ThemeContext';

const DISTANCE_OPTIONS: { value: DistanceFilter; label: string }[] = [
  { value: 1, label: '1 mile' },
  { value: 2, label: '2 miles' },
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
  { value: 25, label: '25 miles' },
  { value: null, label: 'All' },
];

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    events,
    refreshEvents,
    loading,
    error,
    distanceFilter,
    setDistanceFilter,
    locationAvailable
  } = useEvents();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Set refreshing when filter changes and events are loading
  useEffect(() => {
    if (loading) {
      setRefreshing(true);
    } else {
      setRefreshing(false);
    }
  }, [loading]);

  // Calculate number of columns (2 or 3 columns)
  const gap = 32;
  const padding = 16;
  const availableWidth = width - (padding * 2);
  // Force 2 or 3 columns based on screen width
  const numColumns = availableWidth > 600 ? 3 : 2;
  const imageWidth = (availableWidth - (numColumns - 1) * gap) / numColumns;
  const imageHeight = (imageWidth * 3) / 2; // Maintain 2:3 profile aspect ratio

  const backgroundColor = Colors[colorScheme].background;
  const borderColor = '#f5f5f5'; // Slightly off-white border for both light and dark mode
  const textColor = Colors[colorScheme].text;
  const tintColor = Colors[colorScheme].tint;

  const handleDistanceSelect = (distance: DistanceFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDistanceFilter(distance);
  };

  // Generate random rotation values synchronously when events change
  // Use a seeded random function based on event ID for consistent rotation per event
  const rotations = useMemo(() => {
    return events.map((event) => {
      let hash = 0;
      for (let i = 0; i < event.id.length; i++) {
        hash = ((hash << 5) - hash) + event.id.charCodeAt(i);
        hash = hash & hash;
      }
      const normalized = (Math.abs(hash) % 1000) / 1000;
      return (normalized * 10 - 5);
    });
  }, [events]);

  const handleCardPress = (event: Event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/event/${event.id}`);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshEvents();
    } catch (error) {
      console.error('[HomeScreen] Error refreshing events:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item, index }: { item: Event; index: number }) => {
    const isLastInRow = (index + 1) % numColumns === 0;
    return (
      <TouchableOpacity
        onPress={() => handleCardPress(item)}
        activeOpacity={0.9}
        style={{
          width: imageWidth,
          height: imageHeight,
          marginRight: isLastInRow ? 0 : gap,
          marginBottom: gap,
          borderWidth: 3,
          borderColor: borderColor,
          borderRadius: 0,
          overflow: 'hidden',
          transform: [{ rotate: `${rotations[index] || 0}deg` }],
        }}
      >
        <Image
          source={{ uri: item.posterImage }}
          style={{
            width: '100%',
            height: '100%',
          }}
          contentFit="cover"
          transition={200}
        />
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => {
    if (loading && events.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 }}>
          <Text style={{ color: textColor, fontSize: 16, opacity: 0.7 }}>Loading events…</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 }}>
          <Text style={{ color: textColor, fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
            Something went wrong
          </Text>
          <Text style={{ color: textColor, fontSize: 15, opacity: 0.8, textAlign: 'center', marginBottom: 24 }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={{
              backgroundColor: tintColor,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 }}>
        <Text style={{ color: textColor, fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
          No events yet
        </Text>
        <Text style={{ color: textColor, fontSize: 15, opacity: 0.8, textAlign: 'center' }}>
          Events near you will show up here. Pull down to refresh or add your own from the Add tab.
        </Text>
      </View>
    );
  };

  const renderHeader = () => {
    return (
      <View style={{ paddingHorizontal: padding, paddingTop: padding, paddingBottom: padding }}>
        {error && events.length > 0 && (
          <TouchableOpacity
            onPress={onRefresh}
            style={{
              marginBottom: 12,
              backgroundColor: Colors[colorScheme].yellow + '20',
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: Colors[colorScheme].yellow + '40',
            }}
          >
            <Text style={{ color: textColor, fontSize: 14, textAlign: 'center' }}>
              Couldn't load latest. Tap to retry.
            </Text>
          </TouchableOpacity>
        )}
        {!locationAvailable && (
          <View
            style={{
              marginTop: 12,
              backgroundColor: backgroundColor,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: borderColor,
            }}
          >
            <Text
              style={{
                color: textColor,
                fontSize: 13,
                textAlign: 'center',
                lineHeight: 18,
              }}
            >
              Location access is needed to filter events by distance.{'\n'}
              Enable location in Settings to use proximity filtering.
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="mappin.and.ellipse">
          {DISTANCE_OPTIONS.map((option) => (
            <Stack.Toolbar.MenuAction
              key={option.value ?? 'all'}
              isOn={distanceFilter === option.value}
              onPress={() => handleDistanceSelect(option.value)}
            >
              {option.label}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <View className="flex-1" style={{ backgroundColor }}>
        <FlatList
          data={events}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          style={{ backgroundColor }}
          contentContainerStyle={{
            padding,
            paddingTop: insets.top, // clear transparent header (~44pt nav bar)
            paddingBottom: padding + insets.bottom,
            minHeight: '100%',
          }}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyComponent}
          columnWrapperStyle={numColumns > 1 ? { justifyContent: 'flex-start' } : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors[colorScheme].tint}
              progressViewOffset={Platform.OS === 'ios' ? insets.top : 0}
            />
          }
        />
      </View>
    </>
  );
}
