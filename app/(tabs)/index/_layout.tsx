import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

export default function BoardTabLayout() {
  const { colorScheme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTintColor: Colors[colorScheme].text,
        title: '',
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
