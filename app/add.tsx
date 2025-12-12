import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

export default function AddScreen() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-black justify-center items-center px-6">
        <Text className="text-lg text-gray-900 dark:text-white text-center mb-4">
          We need your permission to use the camera
        </Text>
        <TouchableOpacity
          className="bg-blue-500 dark:bg-blue-600 px-8 py-4 rounded-lg"
          onPress={requestPermission}
        >
          <Text className="text-white font-semibold text-lg">Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    // Handle form submission here
    Alert.alert('Success', 'Your post has been created!');
    // Reset form
    setName('');
    setLocation('');
    setWebsite('');
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Camera Preview */}
        <View className="w-full h-64 rounded-lg overflow-hidden mb-6 bg-gray-200 dark:bg-gray-800">
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={facing}
          >
            <View className="flex-1 justify-end items-center pb-4">
              <TouchableOpacity
                className="bg-white/30 px-6 py-3 rounded-full"
                onPress={toggleCameraFacing}
              >
                <Text className="text-white font-semibold">Flip Camera</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>

        {/* Form Fields */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Name
          </Text>
          <TextInput
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholder="Enter name"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Location
          </Text>
          <TextInput
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholder="Enter location"
            placeholderTextColor="#9CA3AF"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Website
          </Text>
          <TextInput
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholder="Enter website URL"
            placeholderTextColor="#9CA3AF"
            value={website}
            onChangeText={setWebsite}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className="bg-blue-500 dark:bg-blue-600 px-8 py-4 rounded-lg"
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Create Post
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

