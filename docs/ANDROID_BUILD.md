# Android Build Configuration

## Prerequisites

Before building your Android app, ensure you have:

1. **Android Studio** installed (latest stable version)
2. **JDK 17** or higher
3. **Android SDK** (installed via Android Studio)
4. **Gradle** (comes with Android Studio)

## Initial Setup

### 1. Install Android Studio

Download from: https://developer.android.com/studio

### 2. Configure Android SDK

1. Open Android Studio
2. Go to **Settings/Preferences** → **Appearance & Behavior** → **System Settings** → **Android SDK**
3. Install:
   - Android SDK Platform 33 (or latest)
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Android SDK Tools

### 3. Set Environment Variables

**Windows:**

```powershell
setx ANDROID_HOME "C:\Users\YourUsername\AppData\Local\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools"
```

**macOS/Linux:**

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

## Building the APK

### Debug APK (for testing)

1. Open Android Studio
2. Run: `npm run mobile:open:android`
3. Wait for Gradle sync to complete
4. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
5. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (for distribution)

#### Step 1: Generate Keystore

```bash
keytool -genkey -v -keystore outreach-management.keystore -alias outreach -keyalg RSA -keysize 2048 -validity 10000
```

Save the keystore file and remember your passwords!

#### Step 2: Create gradle.properties

Create `android/gradle.properties`:

```properties
OUTREACH_UPLOAD_STORE_FILE=../outreach-management.keystore
OUTREACH_UPLOAD_KEY_ALIAS=outreach
OUTREACH_UPLOAD_STORE_PASSWORD=your_store_password
OUTREACH_UPLOAD_KEY_PASSWORD=your_key_password
```

⚠️ **Never commit this file to Git!** Add to `.gitignore`.

#### Step 3: Configure Signing in build.gradle

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file(project.properties['OUTREACH_UPLOAD_STORE_FILE'])
            storePassword project.properties['OUTREACH_UPLOAD_STORE_PASSWORD']
            keyAlias project.properties['OUTREACH_UPLOAD_KEY_ALIAS']
            keyPassword project.properties['OUTREACH_UPLOAD_KEY_PASSWORD']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### Step 4: Build Release APK

```bash
cd android
./gradlew assembleRelease
```

Or in Android Studio:

1. **Build** → **Generate Signed Bundle / APK**
2. Select **APK**
3. Choose your keystore
4. Select **release** variant
5. Click **Finish**

Release APK location: `android/app/build/outputs/apk/release/app-release.apk`

## App Configuration

### Update App Name

Edit `android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">Outreach Management</string>
    <string name="title_activity_main">Outreach Management</string>
    <string name="package_name">com.outreach.management</string>
    <string name="custom_url_scheme">outreach</string>
</resources>
```

### Update App ID

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    defaultConfig {
        applicationId "com.outreach.management"
        ...
    }
}
```

### Update App Icon

Replace files in:

- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png`
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`

### Add Permissions

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Required permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Optional permissions (uncomment as needed) -->
    <!-- <uses-permission android:name="android.permission.CAMERA" /> -->
    <!-- <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" /> -->
    <!-- <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" /> -->
    <!-- <uses-permission android:name="android.permission.RECORD_AUDIO" /> -->

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:usesCleartextTraffic="true"
        android:theme="@style/AppTheme">
        ...
    </application>
</manifest>
```

## Testing on Device

### Via USB

1. Enable **Developer Options** on your Android device:
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times
2. Enable **USB Debugging** in **Developer Options**
3. Connect device via USB
4. In Android Studio, select your device from the dropdown
5. Click **Run** (green play button)

### Via WiFi (Android 11+)

1. Connect device and computer to same WiFi
2. In Android Studio: **Run** → **Edit Configurations**
3. Select **Wireless Debugging**
4. Follow pairing instructions

## Troubleshooting

### Gradle Build Failed

```bash
cd android
./gradlew clean
./gradlew build
```

### SDK Location Not Found

Create `android/local.properties`:

```properties
sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### Java Version Issues

Ensure Java 17 is installed:

```bash
java -version
```

If wrong version, set `JAVA_HOME` environment variable.

### Build Takes Forever

Enable Gradle daemon in `~/.gradle/gradle.properties`:

```properties
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.configureondemand=true
```

### Out of Memory

Increase heap size in `android/gradle.properties`:

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

## Google Play Store Deployment

### 1. Create Developer Account

- Go to https://play.google.com/console
- Pay one-time fee ($25)
- Complete account setup

### 2. Prepare Store Listing

Required assets:

- App icon (512x512 PNG)
- Feature graphic (1024x500 PNG)
- Screenshots (at least 2, up to 8)
- Short description (80 chars)
- Full description (4000 chars)
- Privacy policy URL

### 3. Generate App Bundle (AAB)

Recommended format for Play Store:

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### 4. Upload to Play Store

1. Go to Play Console
2. Create new app
3. Upload AAB file
4. Complete store listing
5. Submit for review

## Version Management

### Update Version

Edit `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        ...
        versionCode 1      // Increment for each release
        versionName "1.0.0" // User-visible version
    }
}
```

### Automated Versioning

Use semantic versioning and automate in CI/CD:

```bash
# Bump version
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

## Resources

- [Android Developer Docs](https://developer.android.com/docs)
- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Gradle User Guide](https://docs.gradle.org/current/userguide/userguide.html)
- [Play Store Publishing Guide](https://developer.android.com/distribute/console)
