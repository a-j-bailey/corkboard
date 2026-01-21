import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { Stack } from 'expo-router';
import { EventProvider } from '../contexts/EventContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { UserProvider } from '../contexts/UserContext';

function RootStack() {
  const { colorScheme } = useTheme();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="event/[id]"
          options={{
            presentation: 'modal',
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
