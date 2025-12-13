import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { FlatList, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventDetailModal from '../components/EventDetailModal';
import { Colors } from '../constants/theme';
import { Event, useEvents } from '../contexts/EventContext';
import { useTheme } from '../contexts/ThemeContext';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { events } = useEvents();
  const [rotations, setRotations] = useState<number[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Calculate number of columns (2 or 3 columns)
  const gap = 32;
  const padding = 16;
  const availableWidth = width - (padding * 2);
  // Force 2 or 3 columns based on screen width
  const numColumns = availableWidth > 600 ? 3 : 2;
  const imageWidth = (availableWidth - (numColumns - 1) * gap) / numColumns;
  const imageHeight = (imageWidth * 3) / 2; // Maintain 2:3 profile aspect ratio

  const backgroundColor = Colors[colorScheme].background;
  const borderColor = colorScheme === 'dark' ? '#ffffff' : '#000000';

  useEffect(() => {
    // Generate random rotation values between -5 and 5 degrees for each event
    const rotationValues = events.map(() => 
      (Math.random() * 10 - 5) // Random value between -5 and 5
    );
    setRotations(rotationValues);
  }, [events]);

  const handleCardPress = (event: Event) => {
    setSelectedEvent(event);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedEvent(null);
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
          paddingTop: padding + insets.top,
          paddingBottom: padding + insets.bottom,
          backgroundColor 
        }}
        columnWrapperStyle={numColumns > 1 ? { justifyContent: 'flex-start' } : undefined}
        showsVerticalScrollIndicator={false}
      />
      <EventDetailModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        event={selectedEvent}
      />
    </View>
  );
}
