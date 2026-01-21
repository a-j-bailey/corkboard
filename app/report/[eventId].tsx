import { Host, Picker } from '@expo/ui/swift-ui';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { useEvents } from '../../contexts/EventContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { createReport } from '../../services/reportService';

const REPORT_CATEGORIES = [
  'Wrong Information',
  'Inappropriate Content',
  'Invalid Event',
  'Private Event',
  'Spam',
  'Other',
] as const;

type ReportCategory = typeof REPORT_CATEGORIES[number];

export default function ReportScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const { user } = useUser();
  const { events } = useEvents();
  
  const textColor = Colors[colorScheme].text;
  const backgroundColor = Colors[colorScheme].background;
  const tintColor = Colors[colorScheme].tint;
  
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ category?: string; description?: string }>({});

  const selectedCategory = selectedIndex !== null ? REPORT_CATEGORIES[selectedIndex] : null;

  const event = events.find((e) => e.id === eventId);

  const handleSubmit = async () => {
    if (!eventId) {
      Alert.alert('Error', 'Event ID is missing');
      return;
    }

    // Validate
    const newErrors: { category?: string; description?: string } = {};
    
    if (!selectedCategory) {
      newErrors.category = 'Please select a category';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Please provide a description';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (description.trim().length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await createReport(
        user?.id || null,
        eventId,
        selectedCategory!,
        description.trim()
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Report Submitted',
        'Thank you for your report. We will review it shortly.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('[ReportScreen] Error submitting report:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit report';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategorySelect = (index: number) => {
    setSelectedIndex(index);
    if (errors.category) {
      setErrors((prev) => ({ ...prev, category: undefined }));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!eventId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: textColor, fontSize: 16 }}>Missing event ID.</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          activeOpacity={0.7}
          style={{
            marginTop: 16,
            backgroundColor: textColor,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: backgroundColor, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={{ flex: 1, backgroundColor, paddingTop: 16 }}>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
            gap: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Event Info Card */}
          {event && (
            <GlassView
              style={{
                borderRadius: 20,
                padding: 20,
                overflow: 'hidden',
              }}
              glassEffectStyle="regular"
            >
              <Text
                style={{
                  color: textColor,
                  fontSize: 14,
                  fontWeight: '600',
                  marginBottom: 8,
                  opacity: 0.7,
                }}
              >
                Reporting Event
              </Text>
              <Text
                style={{
                  color: textColor,
                  fontSize: 18,
                  fontWeight: '600',
                }}
              >
                {event.title}
              </Text>
            </GlassView>
          )}

          {/* Category Selection */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: textColor,
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              Category
            </Text>
            <GlassView
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                minHeight: 200,
              }}
              glassEffectStyle="regular"
            >
              <Host style={{ height: 200 }}>
                <Picker
                  options={[...REPORT_CATEGORIES]}
                  selectedIndex={selectedIndex !== null ? selectedIndex : 0}
                  onOptionSelected={({ nativeEvent: { index } }) => {
                    handleCategorySelect(index);
                  }}
                  variant="wheel"
                />
              </Host>
            </GlassView>
            {errors.category && (
              <Text
                style={{
                  color: '#EF4444',
                  fontSize: 14,
                  marginTop: -8,
                }}
              >
                {errors.category}
              </Text>
            )}
          </View>

          {/* Description Field */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: textColor,
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              Description
            </Text>
            <GlassView
              style={{
                borderRadius: 16,
                padding: 18,
                overflow: 'hidden',
                minHeight: 150,
              }}
              glassEffectStyle="regular"
            >
              <TextInput
                style={{
                  color: textColor,
                  fontSize: 16,
                  minHeight: 120,
                  textAlignVertical: 'top',
                }}
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  if (errors.description) {
                    setErrors((prev) => ({ ...prev, description: undefined }));
                  }
                }}
                placeholder="Please describe the issue..."
                placeholderTextColor={textColor + '60'}
                multiline
                maxLength={1000}
                editable={!isSubmitting}
              />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    color: textColor,
                    fontSize: 12,
                    opacity: 0.5,
                  }}
                >
                  {description.length}/1000
                </Text>
              </View>
            </GlassView>
            {errors.description && (
              <Text
                style={{
                  color: '#EF4444',
                  fontSize: 14,
                  marginTop: -8,
                }}
              >
                {errors.description}
              </Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.7}
            disabled={isSubmitting}
            style={{ marginTop: 8 }}
          >
            <GlassView
              style={{
                borderRadius: 16,
                paddingVertical: 18,
                paddingHorizontal: 24,
                overflow: 'hidden',
                opacity: isSubmitting ? 0.6 : 1,
              }}
              glassEffectStyle="regular"
              tintColor={tintColor}
              isInteractive
            >
              {isSubmitting ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                >
                  <ActivityIndicator size="small" color={backgroundColor} />
                  <Text
                    style={{
                      color: backgroundColor,
                      fontSize: 17,
                      fontWeight: '700',
                    }}
                  >
                    Submitting...
                  </Text>
                </View>
              ) : (
                <Text
                  style={{
                    color: backgroundColor,
                    fontSize: 17,
                    fontWeight: '700',
                    textAlign: 'center',
                  }}
                >
                  Submit Report
                </Text>
              )}
            </GlassView>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
