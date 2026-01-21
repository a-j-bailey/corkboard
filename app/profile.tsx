import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text';
import { Colors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

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
                fontSize: 32,
                fontWeight: '700',
                color: '#FFFFFF',
              }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={{
                fontSize: 24,
                fontWeight: '700',
                color: textColor,
              }}>
                {displayName}
              </Text>
              {email && (
                <Text style={{
                  fontSize: 16,
                  color: colorScheme === 'dark' ? '#9BA1A6' : '#687076',
                  textAlign: 'center',
                }}>
                  {email}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={signOut}
            style={{
              backgroundColor: colorScheme === 'dark' ? '#DC2626' : '#EF4444',
              paddingVertical: 16,
              borderRadius: 8,
              width: '100%',
            }}
            activeOpacity={0.8}
          >
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                textAlign: 'center',
                fontWeight: '600',
                fontSize: 18,
              }}
            >
              Sign Out
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // User is not logged in - show sign in options
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            color: textColor,
            marginBottom: 16,
          }}>
            Welcome!
          </Text>
          <Text style={{
            fontSize: 16,
            color: colorScheme === 'dark' ? '#9BA1A6' : '#687076',
            textAlign: 'center',
            marginBottom: 8,
            lineHeight: 24,
          }}>
            Create an account to save and submit event posters to your corkboard.
          </Text>
        </View>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
            style={{ width: '100%', maxWidth: 300, height: 50 }}
            onPress={signInWithApple}
          />
        )}

        {Platform.OS !== 'ios' && (
          <TouchableOpacity
            onPress={signInWithApple}
            style={{
              backgroundColor: colorScheme === 'dark' ? '#2563EB' : '#3B82F6',
              paddingHorizontal: 32,
              paddingVertical: 16,
              borderRadius: 8,
              width: '100%',
              maxWidth: 300,
            }}
            activeOpacity={0.8}
          >
            <ThemedText
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
              style={{
                textAlign: 'center',
                fontWeight: '600',
                fontSize: 18,
              }}
            >
              Sign In with Apple
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

