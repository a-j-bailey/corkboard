import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { Colors } from '@/constants/theme';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { EventProvider } from '../contexts/EventContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

function RootLayoutContent() {
  const { colorScheme } = useTheme();
  
  return (
    <>
      <NativeTabs tintColor={Colors[colorScheme].tint}>
        <NativeTabs.Trigger name="index">
          <Icon sf="square.grid.2x2.fill" />
          <Label>Board</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon sf="person.fill" />
          <Label>Profile</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="add" role="search">
          <Icon sf="pin.fill" />
          <Label>Add</Label>
        </NativeTabs.Trigger>
        {/* <NativeTabs.Trigger name="preview">
          <Icon sf="eye.fill" />
          <Label>Preview</Label>
        </NativeTabs.Trigger> */}
      </NativeTabs>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <EventProvider>
        <RootLayoutContent />
      </EventProvider>
    </ThemeProvider>
  );
}
