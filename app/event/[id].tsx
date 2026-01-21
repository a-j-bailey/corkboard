import { BottomSheet, Host } from '@expo/ui/swift-ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventDetailModal from '../../components/EventDetailModal';
import { Colors } from '../../constants/theme';
import { useEvents } from '../../contexts/EventContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function EventSheetRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { colorScheme } = useTheme();
  const { events, refreshEvents, loading } = useEvents();
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const event = useMemo(
    () => events.find((e) => e.id === id),
    [events, id]
  );

  useEffect(() => {
    if (!event && id && !loading) {
      setIsRefreshing(true);
      refreshEvents().finally(() => setIsRefreshing(false));
    }
  }, [event, id, loading, refreshEvents]);

  const handleClose = () => {
    setIsSheetOpen(false);
    router.back();
  };

  const textColor = Colors[colorScheme].text;
  const backgroundColor = Colors[colorScheme].background;

  const renderFallback = (message: string, showSpinner = false) => (
    <View style={{ padding: 24, paddingTop: insets.top + 24, gap: 16 }}>
      {showSpinner && <ActivityIndicator color={textColor} />}
      <Text style={{ color: textColor, fontSize: 16 }}>{message}</Text>
      <TouchableOpacity
        onPress={handleClose}
        activeOpacity={0.7}
        style={{
          alignSelf: 'flex-start',
          backgroundColor: textColor,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: backgroundColor, fontWeight: '600' }}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Host style={{ flex: 1, backgroundColor }}>
      <BottomSheet
        isOpened={isSheetOpen}
        onIsOpenedChange={(isOpen) => {
          setIsSheetOpen(isOpen);
          if (!isOpen) {
            handleClose();
          }
        }}
      >
        {!id
          ? renderFallback('Missing event id.')
          : loading || isRefreshing
            ? renderFallback('Loading event…', true)
            : event
              ? <EventDetailModal event={event} onClose={handleClose} />
              : renderFallback('Event not found.')}
      </BottomSheet>
    </Host>
  );
}
