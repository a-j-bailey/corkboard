import { Host } from '@expo/ui/swift-ui';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text';
import { Colors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

export default function ProfileScreen() {
  const { colorScheme } = useTheme();
  const { user, loading, isSuperUser, signInWithApple, signOut } = useUser();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const backgroundColor = Colors[colorScheme].background;
  const textColor = Colors[colorScheme].text;
  const tintColor = Colors[colorScheme].tint;
  const yellowColor = Colors[colorScheme].yellow;
  const userJotUrl = 'https://corkboard.userjot.com/';

  const handleOpenUserJotFeedback = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await WebBrowser.openBrowserAsync(userJotUrl);
    } catch (error) {
      console.error('Error opening UserJot:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Defer GlassView mount until screen is focused + one frame (fixes first-visit no-render with native tabs)
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

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor,
          paddingTop: headerHeight,
          paddingBottom: insets.bottom,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {canShowGlass ? (
          <GlassView
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            glassEffectStyle="regular"
          >
            <ActivityIndicator size="large" color={textColor} />
          </GlassView>
        ) : (
          <View style={{ width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: backgroundColor + 'E6' }}>
            <ActivityIndicator size="large" color={textColor} />
          </View>
        )}
      </View>
    );
  }

  if (user) {
    // User is logged in - show profile info
    const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

    const cardBackgroundColor = Colors[colorScheme].backgroundSecondary;
    const separatorColor = colorScheme === 'dark' ? '#333' : '#E5E7EB';
    const chevronColor = Colors[colorScheme].text;
    const circleIconColor = '#FFFFFF';

    const SettingsRow = ({
      title,
      subtitle,
      leftIcon,
      onPress,
      showChevron = true,
      showSeparator = true,
    }: {
      title: string;
      subtitle?: string;
      leftIcon?: ReactNode | null;
      onPress: () => void | Promise<void>;
      showChevron?: boolean;
      showSeparator?: boolean;
    }) => {
      return (
        <>
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            style={{ backgroundColor: 'transparent' }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 15,
                paddingHorizontal: 16,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: leftIcon ? 12 : 0, flex: 1 }}>
                {leftIcon}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: textColor, fontWeight: '600', fontSize: 17 }}>{title}</Text>
                  {subtitle ? (
                    <Text style={{ color: textColor, opacity: 0.6, fontSize: 14, marginTop: 2 }}>{subtitle}</Text>
                  ) : null}
                </View>
              </View>

              {showChevron ? (
                <Ionicons name="chevron-forward" size={18} color={chevronColor} style={{ opacity: 0.35 }} />
              ) : (
                <View style={{ width: 18 }} />
              )}
            </View>
          </TouchableOpacity>
          {showSeparator ? <View style={{ height: 1, backgroundColor: separatorColor }} /> : null}
        </>
      );
    };

    return (
      <View style={{ flex: 1, backgroundColor }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: headerHeight + 12,
            paddingBottom: insets.bottom + 24,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header Card */}
          <View
            style={{
              backgroundColor: cardBackgroundColor,
              borderRadius: 22,
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
            accessibilityRole="button"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#FF7A45',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="happy-outline" size={20} color={textColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: textColor, fontWeight: '700', fontSize: 18 }}>{displayName}</Text>
                {isSuperUser ? (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      marginTop: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: tintColor + '28',
                    }}
                  >
                    <Text style={{ color: tintColor, fontSize: 12, fontWeight: '600' }}>Super user</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Bookmarks + Submissions */}
          <View style={{ backgroundColor: cardBackgroundColor, borderRadius: 18, overflow: 'hidden' }}>
            <SettingsRow
              title="Bookmarks"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/bookmarks');
              }}
              leftIcon={
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: Colors[colorScheme].goldenPollen,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="bookmark-outline" size={18} color={circleIconColor} />
                </View>
              }
              showSeparator
            />
            <SettingsRow
              title="Submissions"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/submissions');
              }}
              leftIcon={
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: Colors[colorScheme].tint,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="pin-outline" size={18} color={circleIconColor} />
                </View>
              }
              showSeparator={false}
            />
          </View>

          {/* Resources */}
          <Text style={{ color: Colors[colorScheme].icon, opacity: 0.55, fontSize: 15, fontWeight: '600', marginTop: 16 }}>
            Resources
          </Text>
          <View style={{ backgroundColor: cardBackgroundColor, borderRadius: 18, overflow: 'hidden' }}>
            <SettingsRow
              title="Support & Feedback"
              onPress={() => {
                void handleOpenUserJotFeedback();
              }}
              leftIcon={
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: tintColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={circleIconColor} />
                </View>
              }
              showSeparator
            />
            <SettingsRow
              title="Sign Out"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                signOut();
              }}
              showChevron={false}
              showSeparator={false}
              leftIcon={null}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // User not logged in - show sign in
  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        paddingTop: headerHeight,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
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
        {/* Welcome Card */}
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

        {/* Sign In Button */}
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
            <TouchableOpacity onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              signInWithApple();
            }} activeOpacity={0.7}>
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
            <TouchableOpacity onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              signInWithApple();
            }} activeOpacity={0.7}>
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
