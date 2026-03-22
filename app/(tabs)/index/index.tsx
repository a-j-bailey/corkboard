import { isGlassEffectAPIAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Platform, RefreshControl, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Palette } from '../../../constants/theme';
import { DistanceFilter, Event, useEvents } from '../../../contexts/EventContext';
import { useTheme } from '../../../contexts/ThemeContext';

const DISTANCE_OPTIONS: { value: DistanceFilter; label: string }[] = [
  { value: 1, label: '1 mile' },
  { value: 2, label: '2 miles' },
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
  { value: 25, label: '25 miles' },
  ...(__DEV__ ? [{ value: null, label: 'All' }] : []),
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

  const MAX_DISTANCE: DistanceFilter = 25;
  const shouldSuggestWiden = distanceFilter !== null && distanceFilter < MAX_DISTANCE;

  const formatMiles = (m: number) => (m === 1 ? '1 mile' : `${m} miles`);
  const emptyTitle =
    distanceFilter === null ? 'No events yet' : `No events within ${formatMiles(distanceFilter)}`;
  const emptySubtitle = !locationAvailable
    ? 'Turn on location to see nearby events within your selected radius.'
    : shouldSuggestWiden
      ? `No events within ${formatMiles(distanceFilter)} yet. Widen the distance to catch more nearby events.`
      : 'Nothing is showing up right now—try again soon, or add your own.';

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

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/profile');
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
    // Poster mockups use theme palette colors, blended into pastels without transparency.
    const hexToRgb = (hex: string) => {
      const cleaned = hex.replace('#', '');
      const normalized = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
      const intVal = Number.parseInt(normalized, 16);
      const r = (intVal >> 16) & 255;
      const g = (intVal >> 8) & 255;
      const b = intVal & 255;
      return { r, g, b };
    };

    const rgbToHex = (r: number, g: number, b: number) => {
      const toHex = (v: number) => v.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    // ratioFrom: 0..1, where 0 = background, 1 = source color.
    const blendHex = (from: string, to: string, ratioFrom: number) => {
      const a = hexToRgb(from);
      const b = hexToRgb(to);
      const t = Math.max(0, Math.min(1, ratioFrom));
      const r = Math.round(a.r * t + b.r * (1 - t));
      const g = Math.round(a.g * t + b.g * (1 - t));
      const bb = Math.round(a.b * t + b.b * (1 - t));
      return rgbToHex(r, g, bb);
    };

    const background = Colors[colorScheme].background;
    const text = Colors[colorScheme].text;
    const posterBaseColors = [Palette.coral, Palette.goldenPollen, Palette.steelBlue];

    // Pastel poster fills
    const pastelRatio = colorScheme === 'dark' ? 0.28 : 0.18;
    const posterBgColors = posterBaseColors.map((c) => blendHex(c, background, pastelRatio));

    // Darker skeleton bars (solid fills) derived from the poster pastels.
    const skeletonLineBgColors = posterBgColors.map((bg) => {
      if (colorScheme === 'dark') {
        return blendHex(bg, background, 0.55);
      }
      // In light mode, move skeletons toward the text color (darker).
      return blendHex(bg, text, 0.40);
    });

    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 64,
          paddingHorizontal: 32,
        }}
      >
        <View style={{ width: '100%', maxWidth: 520 }}>
          {/* Skeleton placeholders (to match the empty-state vibe you shared) */}
          <View
            style={{
              marginBottom: 64,
              width: '100%',
              height: 175,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {[0, 1, 2].map((i) => {
              const fanRotateDeg = i === 0 ? '-14deg' : i === 1 ? '0deg' : '8deg';
              const fanTranslateX = i === 0 ? -70 : i === 1 ? 0 : 70;
              const fanTranslateY = i === 0 ? 10 : i === 1 ? 0 : 8;
              const z = i === 1 ? 3 : 2;

              return (
                // eslint-disable-next-line react/no-array-index-key
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    width: 136,
                    height: 170,
                    borderRadius: 16,
                    backgroundColor: posterBgColors[i] ?? posterBgColors[0],
                    borderWidth: 2,
                    borderColor: Colors[colorScheme].background,
                    transform: [
                      { translateX: fanTranslateX },
                      { translateY: fanTranslateY },
                      { rotate: fanRotateDeg },
                    ],
                    zIndex: z,
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ padding: 13 }}>
                    <View
                      style={{
                        height: 8,
                        width: '66%',
                        borderRadius: 8,
                      backgroundColor: skeletonLineBgColors[i] ?? skeletonLineBgColors[0],
                      }}
                    />
                    <View
                      style={{
                        marginTop: 12,
                        height: 8,
                        width: '90%',
                        borderRadius: 8,
                      backgroundColor: skeletonLineBgColors[i] ?? skeletonLineBgColors[0],
                      }}
                    />
                    <View
                      style={{
                        marginTop: 9,
                        height: 8,
                        width: `${56 + i * 10}%`,
                        borderRadius: 8,
                      backgroundColor: skeletonLineBgColors[i] ?? skeletonLineBgColors[0],
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <Text
            style={{
              color: textColor,
              fontSize: 22,
              fontWeight: '800',
              textAlign: 'center',
              lineHeight: 28,
              marginBottom: 10,
            }}
          >
            {emptyTitle}
          </Text>
          <Text
            style={{
              color: textColor,
              fontSize: 14.5,
              opacity: 0.82,
              textAlign: 'center',
              lineHeight: 20,
              marginBottom: 18,
            }}
          >
            {emptySubtitle}
          </Text>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (shouldSuggestWiden) {
                setDistanceFilter(MAX_DISTANCE);
              } else {
                router.push('/add');
              }
            }}
            activeOpacity={0.9}
            style={{
              width: '100%',
              backgroundColor: tintColor,
              paddingVertical: 14,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10 as any,
            }}
          >
            <Ionicons name="location-outline" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
              {shouldSuggestWiden ? 'Show events up to 25 miles' : 'Add an event'}
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              marginTop: 12,
              color: textColor,
              fontSize: 12.5,
              opacity: 0.65,
              textAlign: 'center',
              lineHeight: 16,
            }}
          >
            {shouldSuggestWiden ? 'Bigger radius, bigger feed.' : 'Post one and make the board move.'}
          </Text>
        </View>
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
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={handleProfilePress} accessibilityLabel="Profile">
          <Stack.Toolbar.Icon sf="person.fill" />
          <Stack.Toolbar.Label>Profile</Stack.Toolbar.Label>
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
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
            paddingTop: isGlassEffectAPIAvailable() ? insets.top : padding,
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
