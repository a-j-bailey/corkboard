import { Colors } from '@/constants/theme';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

export default function TabsLayout() {
  const { colorScheme } = useTheme();
  const { user } = useUser();

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
        {user && (
          <NativeTabs.Trigger name="add/index" role="search">
            <Icon sf="pin.fill" />
            <Label>Add</Label>
          </NativeTabs.Trigger>
        )}
      </NativeTabs>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
