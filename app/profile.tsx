import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
          <View style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 36 }}>👤</Text>
          </View>
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            color: textColor,
            marginBottom: 8,
          }}>
            Welcome!
          </Text>
          <Text style={{
            fontSize: 16,
            color: colorScheme === 'dark' ? '#9BA1A6' : '#687076',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            Create an account to get started and personalize your experience.
          </Text>
          <View style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6',
            borderRadius: 9999,
          }}>
            <Text style={{
              fontSize: 14,
              color: colorScheme === 'dark' ? '#D1D5DB' : '#374151',
              fontWeight: '500',
            }}>
              Theme: {colorScheme}
            </Text>
          </View>
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
          <Text style={{
            color: '#FFFFFF',
            textAlign: 'center',
            fontWeight: '600',
            fontSize: 18,
          }}>
            Create Account
          </Text>
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
          <Text style={{
            color: colorScheme === 'dark' ? '#9BA1A6' : '#687076',
            textAlign: 'center',
            fontWeight: '500',
          }}>
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

