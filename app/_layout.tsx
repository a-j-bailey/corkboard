import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { Stack } from 'expo-router';
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
          }}
        />
        <Stack.Screen
          name="bookmarks"
          options={{
            title: 'Bookmarks',
          }}
        />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
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
