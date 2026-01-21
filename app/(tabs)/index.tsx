import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Platform, RefreshControl, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { Event, useEvents } from '../../contexts/EventContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { events, refreshEvents, loading } = useEvents();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

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

  return (
    <View className="flex-1" style={{ backgroundColor }}>
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
        ListHeaderComponent={<View style={{ height: padding + insets.top }} />}
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
