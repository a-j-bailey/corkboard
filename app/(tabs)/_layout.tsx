import { Colors } from '@/constants/theme';
import { isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useSegments } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

export default function TabsLayout() {
  const { colorScheme } = useTheme();
  const { user } = useUser();
  const segments = useSegments();
  const isCameraScreen = segments[segments.length - 1] === 'camera';

  return (
    <>
      <NativeTabs
        hidden={isCameraScreen}
        tintColor={Colors[colorScheme].tint}
        backgroundColor={
          !isGlassEffectAPIAvailable() ? Colors[colorScheme].background : undefined
        }
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" />
          <NativeTabs.Trigger.Label hidden>Board</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon sf="person.fill" />
          <NativeTabs.Trigger.Label hidden>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="add" hidden={!user}>
          <NativeTabs.Trigger.Icon sf="pin.fill" />
          <NativeTabs.Trigger.Label hidden>Add</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
