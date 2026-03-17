import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Tabs, useSegments } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

const TAB_ICONS = {
  index: 'square.grid.2x2.fill',
  profile: 'person.fill',
  add: 'pin.fill',
} as const;

export default function TabsLayout() {
  const { colorScheme } = useTheme();
  const { user } = useUser();
  const segments = useSegments();
  const lastSegment = segments[segments.length - 1];
  const hideTabs = lastSegment === 'add' || lastSegment === 'preview';
  const useNativeTabs = isGlassEffectAPIAvailable();

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
          <NativeTabs.Trigger name="profile">
            <NativeTabs.Trigger.Icon sf="person.fill" />
            <NativeTabs.Trigger.Label hidden>Profile</NativeTabs.Trigger.Label>
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
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol name="person.fill" color={color} size={size ?? 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add Event',
            // href: user ? undefined : null,
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
