import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, FlatList, Platform, Pressable, RefreshControl, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { DistanceFilter, Event, useEvents } from '../../contexts/EventContext';
import { useTheme } from '../../contexts/ThemeContext';

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

  const showFilterMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'ios') {
      const options = [...DISTANCE_OPTIONS.map(opt => opt.label), 'Cancel'];
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
        },
        (buttonIndex: number) => {
          if (buttonIndex !== cancelButtonIndex) {
            handleDistanceSelect(DISTANCE_OPTIONS[buttonIndex].value);
          }
        }
      );
    }
  };

  // Generate random rotation values synchronously when events change
  // Use a seeded random function based on event ID to ensure consistent rotation per event
  const rotations = useMemo(() => {
    return events.map((event) => {
      // Use event ID as seed for consistent rotation per event
      let hash = 0;
      for (let i = 0; i < event.id.length; i++) {
        hash = ((hash << 5) - hash) + event.id.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
      }
      // Generate rotation between -5 and 5 degrees using seeded value
      const normalized = (Math.abs(hash) % 1000) / 1000;
      return (normalized * 10 - 5); // Random value between -5 and 5
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

  const renderHeader = () => {
    return (
      <View style={{ paddingHorizontal: padding, paddingTop: padding + insets.top, paddingBottom: padding }}>
        {/* Location Unavailable Message */}
        {!locationAvailable && (
          <View
            style={{
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
    <View className="flex-1" style={{ backgroundColor }}>
      {/* Floating Filter Button */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + padding,
          right: padding,
          zIndex: 1000,
        }}
      >
        <GlassView
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          glassEffectStyle="regular"
        >
          <Pressable
            onPress={showFilterMenu}
            style={{
              width: 44,
              height: 44,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <SymbolView
              name="line.3.horizontal.decrease"
              tintColor="#FFFFFF"
              resizeMode="scaleAspectFit"
              style={{
                width: 24,
                height: 24,
              }}
            />
          </Pressable>
        </GlassView>
      </View>
      <FlatList
        data={events}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        style={{ backgroundColor }}
        contentContainerStyle={{
          padding,
          paddingBottom: padding + insets.bottom,
          minHeight: '100%',
        }}
        ListHeaderComponent={renderHeader}
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
  );
}
