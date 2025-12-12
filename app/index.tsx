import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';

const IMAGE_WIDTH = 200;
const IMAGE_HEIGHT = 300; // 2:3 aspect ratio (profile aspect ratio)

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const [images, setImages] = useState<string[]>([]);
  const [rotations, setRotations] = useState<number[]>([]);
  
  // Calculate number of columns (2 or 3 columns)
  const gap = 16;
  const padding = 16;
  const availableWidth = width - (padding * 2);
  // Force 2 or 3 columns based on screen width
  const numColumns = availableWidth > 600 ? 3 : 2;
  const imageWidth = (availableWidth - (numColumns - 1) * gap) / numColumns;
  const imageHeight = (imageWidth * 3) / 2; // Maintain 2:3 profile aspect ratio

  useEffect(() => {
    // Generate array of image URLs from Picsum
    const imageUrls = Array.from({ length: 20 }, (_, i) => 
      `https://picsum.photos/${IMAGE_WIDTH}/${IMAGE_HEIGHT}?random=${i}`
    );
    setImages(imageUrls);
    
    // Generate random rotation values between -5 and 5 degrees for each image
    const rotationValues = Array.from({ length: 20 }, () => 
      (Math.random() * 10 - 5) // Random value between -5 and 5
    );
    setRotations(rotationValues);
  }, []);

  const renderItem = ({ item, index }: { item: string; index: number }) => {
    const isLastInRow = (index + 1) % numColumns === 0;
    return (
      <View
        style={{
          width: imageWidth,
          height: imageHeight,
          marginRight: isLastInRow ? 0 : gap,
          marginBottom: gap,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          borderRadius: 8,
          overflow: 'hidden',
          transform: [{ rotate: `${rotations[index] || 0}deg` }],
        }}
      >
        <Image
          source={{ uri: item }}
          style={{
            width: '100%',
            height: '100%',
          }}
          contentFit="cover"
          transition={200}
        />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-black" style={{ backgroundColor: '#000000' }}>
      <FlatList
        data={images}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        numColumns={numColumns}
        style={{ backgroundColor: '#000000' }}
        contentContainerStyle={{ padding, backgroundColor: '#000000' }}
        columnWrapperStyle={numColumns > 1 ? { justifyContent: 'flex-start' } : undefined}
      />
    </View>
  );
}

