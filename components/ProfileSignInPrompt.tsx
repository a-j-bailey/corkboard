import { Host } from '@expo/ui/swift-ui';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { ThemedText } from './themed-text';

export type ProfileSignInPromptProps = {
  /** Offset from top (e.g. `useHeaderHeight()` on stacked screens). */
  paddingTop?: number;
  paddingBottom?: number;
  paddingHorizontal?: number;
};

/**
 * Welcome + Sign in with Apple for guests. Safe to mount on any screen;
 * defers native glass until focus + one frame (native tabs first-visit fix).
 */
export function ProfileSignInPrompt({
  paddingTop = 0,
  paddingBottom = 0,
  paddingHorizontal = 24,
}: ProfileSignInPromptProps) {
  const { colorScheme } = useTheme();
  const { signInWithApple } = useUser();
  const backgroundColor = Colors[colorScheme].background;
  const textColor = Colors[colorScheme].text;
  const tintColor = Colors[colorScheme].tint;

  const [canShowGlass, setCanShowGlass] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const id = requestAnimationFrame(() => setCanShowGlass(true));
      return () => {
        cancelAnimationFrame(id);
        setCanShowGlass(false);
      };
    }, [])
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        paddingTop,
        paddingBottom,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 32,
          paddingVertical: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {canShowGlass ? (
          <GlassView
            style={{
              borderRadius: 32,
              padding: 32,
              alignItems: 'center',
              overflow: 'hidden',
              maxWidth: 400,
            }}
            glassEffectStyle="regular"
          >
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: tintColor + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <Ionicons name="person-outline" size={48} color={tintColor} />
            </View>

            <ThemedText
              type="title"
              style={{
                color: textColor,
                fontSize: 32,
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              Welcome
            </ThemedText>

            <ThemedText
              type="default"
              style={{
                textAlign: 'center',
                color: textColor,
                opacity: 0.8,
                fontSize: 16,
                lineHeight: 24,
                marginBottom: 8,
              }}
            >
              Sign in to save and sync your corkboard across all your devices.
            </ThemedText>
          </GlassView>
        ) : (
          <View
            style={{
              borderRadius: 32,
              padding: 32,
              alignItems: 'center',
              overflow: 'hidden',
              maxWidth: 400,
              backgroundColor: backgroundColor + 'E6',
            }}
          >
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: tintColor + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <Ionicons name="person-outline" size={48} color={tintColor} />
            </View>
            <ThemedText
              type="title"
              style={{ color: textColor, fontSize: 32, marginBottom: 12, textAlign: 'center' }}
            >
              Welcome
            </ThemedText>
            <ThemedText
              type="default"
              style={{ textAlign: 'center', color: textColor, opacity: 0.8, fontSize: 16, lineHeight: 24, marginBottom: 8 }}
            >
              Sign in to save and sync your corkboard across all your devices.
            </ThemedText>
          </View>
        )}

        <View style={{ width: '100%', maxWidth: 400, gap: 16 }}>
          {Platform.OS === 'ios' ? (
            <Host>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={
                  colorScheme === 'dark'
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={16}
                style={{ width: '100%', height: 56 }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  signInWithApple();
                }}
              />
            </Host>
          ) : canShowGlass ? (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                signInWithApple();
              }}
              activeOpacity={0.7}
            >
              <GlassView
                style={{
                  borderRadius: 16,
                  paddingVertical: 18,
                  paddingHorizontal: 24,
                  overflow: 'hidden',
                  width: '100%',
                }}
                glassEffectStyle="regular"
                tintColor={tintColor}
                isInteractive
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                >
                  <Ionicons name="logo-apple" size={24} color={Colors[colorScheme].background} />
                  <Text
                    style={{
                      color: Colors[colorScheme].background,
                      fontWeight: '700',
                      fontSize: 17,
                    }}
                  >
                    Sign in with Apple
                  </Text>
                </View>
              </GlassView>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                signInWithApple();
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  borderRadius: 16,
                  paddingVertical: 18,
                  paddingHorizontal: 24,
                  overflow: 'hidden',
                  width: '100%',
                  backgroundColor: tintColor + 'E6',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <Ionicons name="logo-apple" size={24} color={Colors[colorScheme].background} />
                  <Text style={{ color: Colors[colorScheme].background, fontWeight: '700', fontSize: 17 }}>
                    Sign in with Apple
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
