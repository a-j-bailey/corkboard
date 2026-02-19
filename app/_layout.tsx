import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { vexo } from 'vexo-analytics';

import { Colors } from '../constants/theme';
import { EventProvider } from '../contexts/EventContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { UserProvider } from '../contexts/UserContext';

function RootStack() {
  const { colorScheme } = useTheme();

  return (
    <>
      <Stack screenOptions={{
        headerStyle: {
          backgroundColor: Colors[colorScheme].background,
        },
        headerTintColor: Colors[colorScheme].text,
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
        <Stack.Screen
          name="event/[id]"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent' },
            title: '',
          }}
        />
        <Stack.Screen
          name="bookmarks"
          options={{
            title: 'Bookmarks',
          }}
        />
        <Stack.Screen
          name="report/[eventId]"
          options={{
            presentation: 'modal',
            title: 'Report Event',
          }}
        />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

// Initialize Vexo analytics (production only). Set EXPO_PUBLIC_VEXO_API_KEY or vexoApiKey in app.json extra.
if (!__DEV__) {
  const vexoApiKey =
    Constants.expoConfig?.extra?.vexoApiKey ?? process.env.EXPO_PUBLIC_VEXO_API_KEY;
  if (vexoApiKey) {
    vexo(vexoApiKey);
  }
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <EventProvider>
          <RootStack />
        </EventProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
