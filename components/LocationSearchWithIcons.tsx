/**
 * Location search with type-based icons. Renders the same UI as
 * LocationAutocomplete but uses different Ionicons per OSM class/type.
 */

import { Ionicons } from '@expo/vector-icons';
import type {
  LocationSuggestion,
  OpenStreetMapResult,
} from '@julekgwa/react-native-places-autocomplete';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

const DEFAULT_THEME = {
  colors: {
    onSurface: '#333333',
    onSurfaceVariant: '#666666',
    primary: '#667eea',
    surface: '#ffffff',
    outline: '#f0f0f0',
  },
  spacing: { iconMargin: 12, iconPadding: 4, lg: 16, md: 12, loaderMargin: 8 },
  typography: {
    body: { fontSize: 16, fontWeight: '500' as const },
    bodySmall: { fontSize: 14, fontWeight: '400' as const },
  },
};

function getIconForSuggestion(
  suggestion: LocationSuggestion<OpenStreetMapResult>,
  color: string,
  size: number
): React.ReactNode {
  const raw = suggestion.raw;
  const osmClass = raw?.class ?? '';
  const osmType = (raw?.type ?? suggestion.type ?? '').toLowerCase();

  // Amenities: food, drink, services
  if (osmClass === 'amenity') {
    if (['restaurant', 'fast_food', 'food_court'].includes(osmType))
      return <Ionicons name="restaurant-outline" size={size} color={color} />;
    if (['cafe', 'coffee_shop'].includes(osmType))
      return <Ionicons name="cafe-outline" size={size} color={color} />;
    if (['pub', 'bar', 'biergarten'].includes(osmType))
      return <Ionicons name="beer-outline" size={size} color={color} />;
    if (['theatre', 'cinema', 'arts_centre'].includes(osmType))
      return <Ionicons name="film-outline" size={size} color={color} />;
    if (['place_of_worship'].includes(osmType))
      return <Ionicons name="business-outline" size={size} color={color} />;
    return <Ionicons name="business-outline" size={size} color={color} />;
  }

  if (osmClass === 'shop')
    return <Ionicons name="storefront-outline" size={size} color={color} />;

  if (osmClass === 'tourism')
    return <Ionicons name="camera-outline" size={size} color={color} />;

  if (osmClass === 'natural') {
    if (['beach', 'water'].includes(osmType))
      return <Ionicons name="water-outline" size={size} color={color} />;
    return <Ionicons name="leaf-outline" size={size} color={color} />;
  }

  if (osmClass === 'building' || osmClass === 'place') {
    if (['house', 'residential', 'apartments'].includes(osmType))
      return <Ionicons name="home-outline" size={size} color={color} />;
    return <Ionicons name="business-outline" size={size} color={color} />;
  }

  if (osmClass === 'railway')
    return <Ionicons name="train-outline" size={size} color={color} />;

  // Default: generic location pin
  return <Ionicons name="location-outline" size={size} color={color} />;
}

export interface LocationSearchWithIconsProps {
  placeholder?: string;
  fetchSuggestions: (query: string) => Promise<LocationSuggestion<OpenStreetMapResult>[]>;
  onLocationSelect: (location: LocationSuggestion<OpenStreetMapResult>) => void;
  onQueryChange?: (query: string) => void;
  onError?: (error: Error) => void;
  debounceMs?: number;
  showRecentSearches?: boolean;
  recentSearches?: string[];
  onRecentSearchesChange?: (searches: string[]) => void;
  maxRecentSearches?: number;
  containerStyle?: ViewStyle;
  inputContainerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  suggestionStyle?: ViewStyle;
  textStyle?: TextStyle;
  theme?: {
    colors?: Partial<typeof DEFAULT_THEME.colors>;
    spacing?: Partial<typeof DEFAULT_THEME.spacing>;
    typography?: Partial<typeof DEFAULT_THEME.typography>;
  };
}

const ICON_SIZE = 20;

export function LocationSearchWithIcons({
  placeholder = 'Search for a location...',
  fetchSuggestions,
  onLocationSelect,
  onQueryChange,
  onError,
  debounceMs = 300,
  showRecentSearches = true,
  recentSearches = [],
  onRecentSearchesChange,
  maxRecentSearches = 5,
  containerStyle,
  inputContainerStyle,
  inputStyle,
  suggestionStyle,
  textStyle,
  theme: themeOverride = {},
}: LocationSearchWithIconsProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion<OpenStreetMapResult>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [internalRecentSearches, setInternalRecentSearches] = useState<string[]>(recentSearches);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = {
    colors: { ...DEFAULT_THEME.colors, ...themeOverride.colors },
    spacing: { ...DEFAULT_THEME.spacing, ...themeOverride.spacing },
    typography: { ...DEFAULT_THEME.typography, ...themeOverride.typography },
  };

  const iconColor = theme.colors.onSurfaceVariant ?? theme.colors.onSurface;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError('');
        const results = await fetchSuggestions(query);
        setSuggestions(results);
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Failed to fetch suggestions');
        setError(e.message);
        setSuggestions([]);
        onError?.(e);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, debounceMs, fetchSuggestions, onError]);

  const handleInputChange = useCallback(
    (text: string) => {
      if (text.length > 100) return;
      setQuery(text);
      setShowSuggestions(true);
      onQueryChange?.(text);
    },
    [onQueryChange]
  );

  const handleSuggestionPress = useCallback(
    (suggestion: LocationSuggestion<OpenStreetMapResult>) => {
      const locationName = suggestion.display_name.split(',')[0] || '';
      setQuery(locationName);
      setShowSuggestions(false);
      if (showRecentSearches) {
        const updated = [
          locationName,
          ...internalRecentSearches.filter((item) => item !== locationName),
        ].slice(0, maxRecentSearches);
        setInternalRecentSearches(updated);
        onRecentSearchesChange?.(updated);
      }
      onLocationSelect(suggestion);
      onQueryChange?.(locationName);
      Keyboard.dismiss();
    },
    [
      onLocationSelect,
      onQueryChange,
      showRecentSearches,
      internalRecentSearches,
      maxRecentSearches,
      onRecentSearchesChange,
    ]
  );

  const handleRecentPress = useCallback(
    (recent: string) => {
      if (!recent.trim() || recent.length > 100) return;
      setQuery(recent);
      setShowSuggestions(false);
      onQueryChange?.(recent);
      Keyboard.dismiss();
    },
    [onQueryChange]
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setError('');
    onQueryChange?.('');
  }, [onQueryChange]);

  const showRecent =
    showSuggestions &&
    query.length === 0 &&
    showRecentSearches &&
    internalRecentSearches.length > 0;

  return (
    <View style={[containerStyle]}>
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginBottom: theme.spacing.md,
          },
          inputContainerStyle,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={iconColor}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={[
            {
              flex: 1,
              fontSize: theme.typography.body.fontSize,
              color: theme.colors.onSurface,
              paddingVertical: 2,
              paddingHorizontal: 0,
              minHeight: 28,
            },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={iconColor}
          value={query}
          onChangeText={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={clearSearch}
            style={{ padding: theme.spacing.iconPadding, marginLeft: theme.spacing.iconMargin }}
          >
            <Ionicons name="close-circle-outline" size={20} color={iconColor} />
          </TouchableOpacity>
        )}
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={{ marginLeft: theme.spacing.loaderMargin }}
          />
        )}
      </View>

      {showSuggestions && (
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 15,
            maxHeight: 400,
            paddingBottom: theme.spacing.md,
          }}
        >
          {showRecent ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 300 }}
            >
              <Text
                style={[
                  {
                    fontSize: theme.typography.body.fontSize,
                    fontWeight: '600',
                    color: theme.colors.onSurface,
                    paddingHorizontal: theme.spacing.lg,
                    paddingTop: theme.spacing.lg,
                    paddingBottom: theme.spacing.md,
                  },
                  textStyle,
                ]}
              >
                Recent Searches
              </Text>
              {internalRecentSearches.map((item, index) => (
                <TouchableOpacity
                  key={`recent-${index}`}
                  onPress={() => handleRecentPress(item)}
                  activeOpacity={0.7}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: theme.spacing.lg,
                      paddingVertical: theme.spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.outline,
                    },
                    suggestionStyle,
                  ]}
                >
                  <View style={{ marginRight: theme.spacing.iconMargin }}>
                    <Ionicons name="time-outline" size={ICON_SIZE} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        { fontSize: theme.typography.body.fontSize, color: theme.colors.onSurface },
                        textStyle,
                      ]}
                      numberOfLines={1}
                    >
                      {item}
                    </Text>
                    <Text
                      style={[
                        {
                          fontSize: theme.typography.bodySmall.fontSize,
                          color: theme.colors.onSurfaceVariant,
                        },
                        textStyle,
                      ]}
                    >
                      Recent search
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <>
              {error ? (
                <View
                  style={{
                    paddingHorizontal: theme.spacing.lg,
                    paddingVertical: theme.spacing.md,
                  }}
                >
                  <Text style={[{ color: theme.colors.onSurfaceVariant }, textStyle]}>
                    {error}
                  </Text>
                </View>
              ) : null}
              {suggestions.length > 0 && (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 300 }}
                >
                  {suggestions.map((item) => (
                    <TouchableOpacity
                      key={item.place_id}
                      onPress={() => handleSuggestionPress(item)}
                      activeOpacity={0.7}
                      style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: theme.spacing.lg,
                          paddingVertical: theme.spacing.md,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.colors.outline,
                        },
                        suggestionStyle,
                      ]}
                    >
                      <View style={{ marginRight: theme.spacing.iconMargin }}>
                        {getIconForSuggestion(item, iconColor, ICON_SIZE)}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            {
                              fontSize: theme.typography.body.fontSize,
                              fontWeight: theme.typography.body.fontWeight,
                              color: theme.colors.onSurface,
                              marginBottom: 2,
                            },
                            textStyle,
                          ]}
                          numberOfLines={1}
                        >
                          {item.display_name.split(',')[0]}
                        </Text>
                        <Text
                          style={[
                            {
                              fontSize: theme.typography.bodySmall.fontSize,
                              color: theme.colors.onSurfaceVariant,
                            },
                            textStyle,
                          ]}
                          numberOfLines={1}
                        >
                          {item.display_name.split(',').slice(1).join(',').trim()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}
