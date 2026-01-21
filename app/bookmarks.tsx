import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text';
import { Colors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function BookmarksScreen() {
  const { colorScheme } = useTheme();
  const router = useRouter();
  const backgroundColor = Colors[colorScheme].background;
  const textColor = Colors[colorScheme].text;
  const tintColor = Colors[colorScheme].tint;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <View style={{ 
        flex: 1, 
        paddingHorizontal: 24, 
        justifyContent: 'center', 
        alignItems: 'center',
        gap: 16
      }}>
        <Ionicons 
          name="bookmark-outline" 
          size={64} 
          color={textColor} 
          style={{ opacity: 0.5 }}
        />
        <ThemedText type="title" style={{ color: textColor, textAlign: 'center' }}>
          Bookmarks
        </ThemedText>
        <ThemedText type="default" style={{ 
          color: textColor, 
          opacity: 0.7, 
          textAlign: 'center',
          maxWidth: 300
        }}>
          Your saved events will appear here
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}
