import { getIconForSuggestion } from '@/components/LocationSearchWithIcons';
import { Colors } from '@/constants/theme';
import { useEvents } from '@/contexts/EventContext';
import { useLocationSelection } from '@/contexts/LocationSelectionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchLocationSuggestions } from '@/services/locationSearchService';
import { formatSuggestionListLines } from '@/utils/formatNominatimSuggestion';
import { Ionicons } from '@expo/vector-icons';
import type { LocationSuggestion, OpenStreetMapResult } from '@julekgwa/react-native-places-autocomplete';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEBOUNCE_MS = 300;
const ICON_SIZE = 20;

export default function LocationSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialAddress?: string }>();
  const { userLocation } = useEvents();
  const { setPendingLocationSelection } = useLocationSelection();
  const { colorScheme } = useTheme();
  const textColor = Colors[colorScheme].text;
  const iconColor = Colors[colorScheme].icon;

  const [query, setQuery] = useState(params.initialAddress ?? '');
  const [suggestions, setSuggestions] = useState<LocationSuggestion<OpenStreetMapResult>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      setError('');
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError('');
        const results = await fetchLocationSuggestions(query, userLocation ?? undefined, 10);
        setSuggestions(results);
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Failed to fetch suggestions');
        setError(e.message);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, userLocation]);

  const handleSelect = useCallback(
    (suggestion: LocationSuggestion<OpenStreetMapResult>) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPendingLocationSelection(suggestion);
      router.back();
    },
    [router, setPendingLocationSelection]
  );

  const renderItem: ListRenderItem<LocationSuggestion<OpenStreetMapResult>> = useCallback(
    ({ item }) => {
      const { primary, secondary } = formatSuggestionListLines(item);
      return (
        <TouchableOpacity
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          }}
        >
          <View style={{ marginRight: 12 }}>
            {getIconForSuggestion(item, iconColor, ICON_SIZE)}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '500',
                color: textColor,
                marginBottom: 2,
              }}
              numberOfLines={2}
            >
              {primary}
            </Text>
            {secondary ? (
              <Text
                style={{
                  fontSize: 14,
                  color: iconColor,
                }}
                numberOfLines={2}
              >
                {secondary}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [handleSelect, textColor, iconColor, colorScheme]
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setError('');
  }, []);

  const listHeader = (
    <>
      {error ? (
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ color: Colors[colorScheme].error, fontSize: 14 }}>{error}</Text>
        </View>
      ) : null}
      {isLoading && suggestions.length === 0 && query.trim().length > 0 ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <GlassView
            style={{
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 10,
              overflow: 'hidden',
            }}
            glassEffectStyle="regular"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="search-outline" size={20} color={iconColor} style={{ marginRight: 10 }} />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: textColor,
                  paddingVertical: 6,
                  paddingHorizontal: 0,
                  minHeight: 28,
                }}
                placeholder="Search for a location..."
                placeholderTextColor={iconColor}
                value={query}
                onChangeText={(text) => {
                  if (text.length <= 100) setQuery(text);
                }}
                autoCorrect={false}
                autoCapitalize="none"
                autoFocus
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={{ padding: 6, marginLeft: 8 }}>
                  <Ionicons name="close-circle-outline" size={20} color={iconColor} />
                </TouchableOpacity>
              )}
              {isLoading && suggestions.length > 0 && (
                <ActivityIndicator size="small" color={Colors[colorScheme].tint} style={{ marginLeft: 8 }} />
              )}
            </View>
          </GlassView>
        </View>

        <FlatList
          data={suggestions}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.place_id)}
          keyboardShouldPersistTaps="always"
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            !isLoading && query.trim().length > 0 && !error ? (
              <View style={{ paddingVertical: 24, paddingHorizontal: 20 }}>
                <Text style={{ color: iconColor, fontSize: 15 }}>No results found</Text>
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
