import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Tabs, useSegments } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../contexts/ThemeContext';

export default function TabsLayout() {
  const { colorScheme } = useTheme();
  const segments = useSegments();
  const { user, loading: authLoading } = useUser();
  const lastSegment = segments[segments.length - 1];

  const hideTabs = user != null && (lastSegment === 'add' || lastSegment === 'preview');
  const useNativeTabs = isGlassEffectAPIAvailable();

  console.log('hideTabs', hideTabs);
  console.log('user', user);
  console.log('authLoading', authLoading);

  if (useNativeTabs) {
    return (
      <>
        <NativeTabs hidden={hideTabs} tintColor={Colors[colorScheme].tint}>
          <NativeTabs.Trigger name="index">
            <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" />
            <NativeTabs.Trigger.Label hidden>Board</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="add">
            <NativeTabs.Trigger.Icon sf="pin.fill" />
            <NativeTabs.Trigger.Label hidden>Add</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        </NativeTabs>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </>
    );
  }

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: Colors[colorScheme].background,
            display: hideTabs ? 'none' : 'flex',
          },
          tabBarActiveTintColor: Colors[colorScheme].tint,
          tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Events',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol name="square.grid.2x2.fill" color={color} size={size ?? 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add Event',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol name="pin.fill" color={color} size={size ?? 24} />
            ),
          }}
        />
      </Tabs>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
