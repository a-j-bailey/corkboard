import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/themed-text';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

export default function ProfileScreen() {
  const { colorScheme } = useTheme();
  const { user, loading, signInWithApple, signOut } = useUser();
  const backgroundColor = Colors[colorScheme].background;
  const textColor = Colors[colorScheme].text;
  const tintColor = Colors[colorScheme].tint;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#3B82F6' : '#2563EB'} />
      </SafeAreaView>
    );
  }

  if (user) {
    // User is logged in - show profile info
    const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const email = user.email || '';

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor }}>
        <View style={{ flex: 1, paddingHorizontal: 24, gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: tintColor,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Text style={{
                fontSize: 24,
                fontWeight: '700',
                color: Colors[colorScheme].background,
              }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ justifyContent: 'center' }}>
              <ThemedText type="title">{displayName}</ThemedText>
              <ThemedText type="default" style={{ color: textColor, opacity: 0.7 }}>
                {email}
              </ThemedText>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={signOut}
              activeOpacity={0.8}
              style={{
                backgroundColor: tintColor,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: Colors[colorScheme].background,
                fontWeight: '700',
                fontSize: 16,
              }}>
                Sign out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // User not logged in - show sign in
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <View style={{ gap: 16, alignItems: 'center' }}>
        <ThemedText type="title" style={{ color: textColor }}>Welcome</ThemedText>
        <ThemedText type="default" style={{ textAlign: 'center', color: textColor, opacity: 0.8 }}>
          Sign in to save and sync your corkboard.
        </ThemedText>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={colorScheme === 'dark'
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={10}
          style={{ width: 240, height: 44 }}
          onPress={signInWithApple}
        />
        {Platform.OS === 'ios' && (
          <TouchableOpacity onPress={signInWithApple} activeOpacity={0.8}>
            <Text style={{ color: tintColor, fontWeight: '600' }}>
              Sign in with Apple
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
