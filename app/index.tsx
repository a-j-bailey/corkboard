import { Image } from 'expo-image';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useState, useEffect } from 'react';

const IMAGE_WIDTH = 200;
const IMAGE_HEIGHT = 300; // 2:3 aspect ratio

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const [images, setImages] = useState<string[]>([]);
  
  // Calculate number of columns based on screen width
  const numColumns = Math.floor(width / (IMAGE_WIDTH + 16)); // 16 for gap
  const imageWidth = (width - (numColumns + 1) * 8) / numColumns; // 8px gap on each side
  const imageHeight = (imageWidth * 3) / 2; // Maintain 2:3 aspect ratio

  useEffect(() => {
    // Generate array of image URLs from Picsum
    const imageUrls = Array.from({ length: 20 }, (_, i) => 
      `https://picsum.photos/${IMAGE_WIDTH}/${IMAGE_HEIGHT}?random=${i}`
    );
    setImages(imageUrls);
  }, []);

  return (
    <ScrollView 
      className="flex-1 bg-white dark:bg-black"
      contentContainerStyle={{ padding: 8 }}
    >
      <View className="flex-row flex-wrap gap-2">
        {images.map((url, index) => (
          <View
            key={index}
            style={{
              width: imageWidth,
              height: imageHeight,
            }}
            className="rounded-lg overflow-hidden"
          >
            <Image
              source={{ uri: url }}
              style={{
                width: '100%',
                height: '100%',
              }}
              contentFit="cover"
              transition={200}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

