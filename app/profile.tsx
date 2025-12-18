import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text';
import { Colors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function ProfileScreen() {
  const { colorScheme } = useTheme();
  const backgroundColor = Colors[colorScheme].background;
  const textColor = Colors[colorScheme].text;
  
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
        
        <TouchableOpacity 
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
            Create Account
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={{
            marginTop: 16,
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 8,
            width: '100%',
            maxWidth: 300,
          }}
          activeOpacity={0.8}
        >
          <ThemedText 
            lightColor="#687076"
            darkColor="#9BA1A6"
            style={{
              textAlign: 'center',
              fontWeight: '500',
            }}
          >
            Sign In
          </ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

