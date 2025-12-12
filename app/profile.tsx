import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export default function ProfileScreen() {
  const { colorScheme } = useTheme();
  
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <View className="flex-1 justify-center items-center px-6">
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 items-center justify-center mb-4">
            <Text className="text-4xl">👤</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome!
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400 text-center mb-4">
            Create an account to get started and personalize your experience.
          </Text>
          <View className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Text className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              Theme: {colorScheme}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          className="bg-blue-500 dark:bg-blue-600 px-8 py-4 rounded-lg w-full max-w-xs"
          activeOpacity={0.8}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Create Account
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="mt-4 px-8 py-4 rounded-lg w-full max-w-xs"
          activeOpacity={0.8}
        >
          <Text className="text-gray-600 dark:text-gray-400 text-center font-medium">
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

