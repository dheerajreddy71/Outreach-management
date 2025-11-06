# Mobile App Setup Guide

This guide will help you convert your Outreach Management web app into native Android and iOS mobile apps using Capacitor.

## 📋 Prerequisites

### For Android:

- Node.js 18+ installed
- Android Studio installed
- Java Development Kit (JDK) 17+
- Android SDK (automatically installed with Android Studio)

### For iOS (macOS only):

- Xcode 14+ installed
- CocoaPods installed: `sudo gem install cocoapods`
- macOS 12+ (Monterey or later)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install all required Capacitor dependencies.

### 2. Run Mobile Setup Script

```bash
node scripts/setup-mobile.js
```

This script will:

- ✅ Install Capacitor CLI and plugins
- ✅ Build your Next.js app for mobile
- ✅ Initialize Capacitor
- ✅ Add Android platform
- ✅ Add iOS platform (if on macOS)
- ✅ Sync all files

### 3. Open in Native IDE

**For Android:**

```bash
npm run mobile:open:android
```

This opens Android Studio with your project.

**For iOS (macOS only):**

```bash
npm run mobile:open:ios
```

This opens Xcode with your project.

## 📱 Building APK/IPA

### Android APK

1. Open Android Studio (using `npm run mobile:open:android`)
2. Wait for Gradle sync to complete
3. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
4. APK will be generated in `android/app/build/outputs/apk/debug/`

**For Release APK:**

1. Go to **Build** → **Generate Signed Bundle / APK**
2. Follow the wizard to create a keystore and sign your APK
3. Choose "APK" and click "Next"
4. Fill in keystore details
5. Select "release" build variant
6. Click "Finish"

### iOS IPA (macOS only)

1. Open Xcode (using `npm run mobile:open:ios`)
2. Select your signing team in **Signing & Capabilities**
3. Connect an iOS device or use simulator
4. Go to **Product** → **Archive**
5. After archiving, click **Distribute App**
6. Follow the wizard to generate IPA

## 🔄 Updating the App

After making changes to your web app:

```bash
npm run mobile:build
```

This will rebuild your Next.js app and sync changes to mobile platforms.

Then reopen in Android Studio or Xcode to rebuild.

## 🎨 Customizing App Icon & Splash Screen

1. Create your app icon (1024x1024px PNG)
2. Create your splash screen (2732x2732px PNG)
3. Place them in the `resources/` directory as:
   - `resources/icon.png`
   - `resources/splash.png`

4. Generate all required sizes:

```bash
npm install -g @capacitor/assets
npx capacitor-assets generate --android --ios
```

5. Sync changes:

```bash
npm run mobile:sync
```

## 🔧 Manual Commands

### Available NPM Scripts

```bash
# Setup mobile platforms (first time only)
npm run mobile:setup

# Build and sync changes
npm run mobile:build

# Sync changes without rebuilding
npm run mobile:sync

# Open Android Studio
npm run mobile:open:android

# Open Xcode (macOS only)
npm run mobile:open:ios
```

### Capacitor CLI Commands

```bash
# Add a platform
npx cap add android
npx cap add ios

# Sync changes
npx cap sync

# Update Capacitor
npx cap update

# Open in IDE
npx cap open android
npx cap open ios

# Copy web assets to native projects
npx cap copy
```

## 🌐 App Configuration

Edit `capacitor.config.ts` to customize:

- **appId**: Your unique app identifier (e.g., com.yourcompany.app)
- **appName**: Display name of your app
- **webDir**: Directory containing built web app (default: 'out')
- **server**: Configure local or remote server
- **plugins**: Configure Capacitor plugins

## 📝 Important Notes

### Static Export Limitation

Since Capacitor requires a static export, some Next.js features are limited:

- ❌ Server-side rendering (SSR)
- ❌ API routes (use external API)
- ❌ Incremental Static Regeneration (ISR)
- ✅ Static pages work perfectly
- ✅ Client-side data fetching works
- ✅ React hooks and state management work

### API Integration

For the mobile app to work with your backend:

1. **Option A: Use Production API**
   - Update `capacitor.config.ts`:

   ```typescript
   server: {
     url: 'https://outreach-management.vercel.app',
     cleartext: true
   }
   ```

2. **Option B: Build Full Offline App**
   - Use local storage/SQLite for data
   - Sync with backend periodically
   - Implement offline-first architecture

### Permissions

Edit `android/app/src/main/AndroidManifest.xml` to add permissions:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

Edit `ios/App/App/Info.plist` for iOS permissions:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to take photos</string>
```

## 🐛 Troubleshooting

### Android Build Fails

1. Check Java version: `java -version` (should be 17+)
2. Update Gradle in Android Studio
3. Clean and rebuild: **Build** → **Clean Project**
4. Invalidate caches: **File** → **Invalidate Caches / Restart**

### iOS Build Fails (macOS)

1. Update CocoaPods: `sudo gem install cocoapods`
2. Install pods: `cd ios/App && pod install`
3. Clean build: In Xcode, **Product** → **Clean Build Folder**
4. Check signing certificate is valid

### App Shows Blank Screen

1. Check `capacitor.config.ts` - ensure `webDir: 'out'`
2. Rebuild: `npm run mobile:build`
3. Check browser console in Android Studio (Logcat) or Xcode (Console)
4. Ensure `out/` directory contains index.html

### Hot Reload Not Working

Hot reload doesn't work in production builds. For development:

1. Run your Next.js dev server: `npm run dev`
2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.1.100:3000', // Your local IP
     cleartext: true
   }
   ```
3. Rebuild and run on device

## 📚 Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Android Developer Guide](https://developer.android.com/)
- [iOS Developer Guide](https://developer.apple.com/documentation/)

## 🆘 Need Help?

If you encounter issues:

1. Check the Capacitor logs: `npx cap doctor`
2. Review Android Studio Logcat or Xcode Console
3. Visit [Capacitor Forums](https://forum.capacitorjs.com/)
4. Check [Stack Overflow](https://stackoverflow.com/questions/tagged/capacitor)

---

**Happy Mobile Development! 📱✨**
