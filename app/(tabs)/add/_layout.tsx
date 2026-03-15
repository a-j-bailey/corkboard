import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { LocationSelectionProvider } from '@/contexts/LocationSelectionContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function AddLayout() {
  const { colorScheme } = useTheme();

  return (
    <LocationSelectionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="camera" />
        <Stack.Screen name="preview" />
        <Stack.Screen
          name="location-search"
          options={{
            presentation: 'modal',
            title: 'Search Location',
            headerShown: true,
            headerStyle: { backgroundColor: Colors[colorScheme].background },
            headerTintColor: Colors[colorScheme].text,
          }}
        />
      </Stack>
    </LocationSelectionProvider>
  );
}
