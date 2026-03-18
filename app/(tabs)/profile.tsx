import { Button, Host, Menu } from '@expo/ui/swift-ui';
import { controlSize, labelStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/themed-text';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

export default function ProfileScreen() {
  const { colorScheme } = useTheme();
  const { user, loading, signInWithApple, signOut } = useUser();
  const router = useRouter();
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

  // Defer GlassView mount until tab is focused + one frame (fixes first-visit no-render with native tabs)
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
      <SafeAreaView style={{ flex: 1, backgroundColor, justifyContent: 'center', alignItems: 'center' }}>
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
      </SafeAreaView>
    );
  }

  if (user) {
    // User is logged in - show profile info
    const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const email = user.email || '';
    const initials = displayName
      .split(' ')
      .map((n: string) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: insets.bottom + 24,
            gap: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header Card */}
          {canShowGlass ? (
            <GlassView
              style={{
                borderRadius: 24,
                padding: 24,
                overflow: 'hidden',
              }}
              glassEffectStyle="regular"
            >
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                {/* Avatar */}
                <GlassView
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                  glassEffectStyle="regular"
                  tintColor={tintColor}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: Colors[colorScheme].background,
                    }}
                  >
                    {initials}
                  </Text>
                </GlassView>

                {/* User Info */}
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <ThemedText
                    type="title"
                    style={{
                      fontSize: 22,
                      fontWeight: '700',
                      marginBottom: 0,
                    }}
                  >
                    {displayName}
                  </ThemedText>
                </View>

                {/* Menu - larger touch target for easier selection */}
                <Host style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden' }}>
                  <Menu
                    systemImage="ellipsis"
                    modifiers={[labelStyle('iconOnly')]}
                    label={<Button systemImage="ellipsis" modifiers={[labelStyle('iconOnly')]} label="Menu Options" />}
                  >
                    <Button
                      label="Sign Out"
                      systemImage="rectangle.portrait.and.arrow.right"
                      modifiers={[padding({ vertical: 14, horizontal: 20 }), controlSize('large')]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        signOut();
                      }}
                      role="destructive"
                    />
                  </Menu>
                </Host>
              </View>
            </GlassView>
          ) : (
            <View style={{ borderRadius: 24, padding: 24, overflow: 'hidden', backgroundColor: backgroundColor + 'E6' }}>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: tintColor + '40',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: Colors[colorScheme].background }}>{initials}</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <ThemedText type="title" style={{ fontSize: 22, fontWeight: '700', marginBottom: 0 }}>
                    {displayName}
                  </ThemedText>
                </View>
                <View style={{ width: 56, height: 56 }} />
              </View>
            </View>
          )}

          {/* Actions Section */}
          <View style={{ gap: 16 }}>
            {/* Bookmarks Button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/bookmarks');
              }}
              activeOpacity={0.7}
            >
              {canShowGlass ? (
                <GlassView
                  style={{
                    borderRadius: 20,
                    paddingVertical: 18,
                    paddingHorizontal: 20,
                    overflow: 'hidden',
                  }}
                  glassEffectStyle="regular"
                  isInteractive
                >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: yellowColor + '20',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="bookmark-outline" size={22} color={yellowColor} />
                    </View>
                    <View>
                      <Text
                        style={{
                          color: textColor,
                          fontWeight: '600',
                          fontSize: 17,
                        }}
                      >
                        Bookmarks
                      </Text>
                      <Text
                        style={{
                          color: textColor,
                          opacity: 0.6,
                          fontSize: 14,
                          marginTop: 2,
                        }}
                      >
                        View your saved events
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={textColor}
                    style={{ opacity: 0.4 }}
                  />
                </View>
              </GlassView>
              ) : (
                <View
                  style={{
                    borderRadius: 20,
                    paddingVertical: 18,
                    paddingHorizontal: 20,
                    overflow: 'hidden',
                    backgroundColor: backgroundColor + 'E6',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: yellowColor + '20',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="bookmark-outline" size={22} color={yellowColor} />
                      </View>
                      <View>
                        <Text style={{ color: textColor, fontWeight: '600', fontSize: 17 }}>Bookmarks</Text>
                        <Text style={{ color: textColor, opacity: 0.6, fontSize: 14, marginTop: 2 }}>
                          View your saved events
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={textColor} style={{ opacity: 0.4 }} />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Feedback Button */}
            <TouchableOpacity
              onPress={() => {
                void handleOpenUserJotFeedback();
              }}
              activeOpacity={0.7}
            >
              {canShowGlass ? (
                <GlassView
                  style={{
                    borderRadius: 20,
                    paddingVertical: 18,
                    paddingHorizontal: 20,
                    overflow: 'hidden',
                  }}
                  glassEffectStyle="regular"
                  isInteractive
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: tintColor + '20',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={22} color={tintColor} />
                      </View>
                      <View>
                        <Text style={{ color: textColor, fontWeight: '600', fontSize: 17 }}>Feedback</Text>
                        <Text style={{ color: textColor, opacity: 0.6, fontSize: 14, marginTop: 2 }}>
                          Share ideas & report bugs
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={textColor}
                      style={{ opacity: 0.4 }}
                    />
                  </View>
                </GlassView>
              ) : (
                <View
                  style={{
                    borderRadius: 20,
                    paddingVertical: 18,
                    paddingHorizontal: 20,
                    overflow: 'hidden',
                    backgroundColor: backgroundColor + 'E6',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: tintColor + '20',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={22} color={tintColor} />
                      </View>
                      <View>
                        <Text style={{ color: textColor, fontWeight: '600', fontSize: 17 }}>Feedback</Text>
                        <Text style={{ color: textColor, opacity: 0.6, fontSize: 14, marginTop: 2 }}>
                          Share ideas & report bugs
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={textColor} style={{ opacity: 0.4 }} />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // User not logged in - show sign in
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor,
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

          {/* Feedback Button (available even when logged out) */}
          <TouchableOpacity
            onPress={() => {
              void handleOpenUserJotFeedback();
            }}
            activeOpacity={0.7}
          >
            {canShowGlass ? (
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
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors[colorScheme].background} />
                  <Text
                    style={{
                      color: Colors[colorScheme].background,
                      fontWeight: '700',
                      fontSize: 17,
                    }}
                  >
                    Give Feedback
                  </Text>
                </View>
              </GlassView>
            ) : (
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
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors[colorScheme].background} />
                  <Text style={{ color: Colors[colorScheme].background, fontWeight: '700', fontSize: 17 }}>
                    Give Feedback
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
