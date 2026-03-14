import { isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

export default function IndexTabLayout() {
  const { colorScheme } = useTheme();
  const useGlass = isGlassEffectAPIAvailable();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: useGlass,
        headerStyle: {
          backgroundColor: useGlass ? 'transparent' : Colors[colorScheme].background,
        },
        headerTintColor: Colors[colorScheme].text,
        title: '',
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
