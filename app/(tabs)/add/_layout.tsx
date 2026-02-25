import { Stack } from 'expo-router';

export default function AddLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="camera" />
      <Stack.Screen 
        name="preview" 
        options={{
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
