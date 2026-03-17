# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Building for iOS Device

### Option 1: EAS Build (Recommended - Cloud Build)

This is the easiest way to build for a physical iOS device. EAS Build handles code signing and builds your app in the cloud.

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to your Expo account**:
   ```bash
   eas login
   ```

3. **Configure your project** (first time only):
   ```bash
   eas build:configure
   ```

4. **Build for iOS device**:
   ```bash
   eas build --platform ios --profile preview
   ```
   
   For a production build:
   ```bash
   eas build --platform ios --profile production --auto-submit
   ```

5. **Install on your device**:
   - After the build completes, you'll get a download link
   - Open the link on your iOS device and install the app
   - You may need to trust the developer certificate in Settings > General > VPN & Device Management

### Option 2: Local Build (Requires Xcode)

If you have Xcode installed and want to build locally:

1. **Install CocoaPods dependencies**:
   ```bash
   cd ios && pod install && cd ..
   ```

2. **Build and run on connected device**:
   ```bash
   npm run ios -- --device
   ```
   
   Or specify a device:
   ```bash
   npx expo run:ios --device
   ```

3. **Open in Xcode** (for more control):
   ```bash
   npx expo prebuild
   ```
   Then open `ios/corkboard.xcworkspace` in Xcode and build/run from there.

### Development Build for Testing

To create a development build that you can use with `expo start`:

```bash
eas build --platform ios --profile development
```

After installing the development build on your device, you can run `npx expo start --dev-client` to connect to it.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.
- [EAS Build documentation](https://docs.expo.dev/build/introduction/): Learn more about building your app with EAS Build.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
