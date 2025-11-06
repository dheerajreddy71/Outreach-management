# Mobile App Resources

This directory contains resources for your mobile app (icons and splash screens).

## Icon Requirements

### Android

Place your app icon as `icon.png` (1024x1024px) in this directory.

Android requires icons in multiple sizes:

- `mipmap-mdpi/ic_launcher.png` - 48x48px
- `mipmap-hdpi/ic_launcher.png` - 72x72px
- `mipmap-xhdpi/ic_launcher.png` - 96x96px
- `mipmap-xxhdpi/ic_launcher.png` - 144x144px
- `mipmap-xxxhdpi/ic_launcher.png` - 192x192px

### iOS

- App Icon: 1024x1024px (will be automatically resized)

## Splash Screen Requirements

### Android

Place your splash screen as `splash.png` (2732x2732px) in this directory.

### iOS

- Splash screen: 2732x2732px (universal size)

## Automatic Generation

You can use tools to automatically generate all required sizes:

### Using Cordova Resources (Recommended)

```bash
npm install -g cordova-res
cordova-res android --skip-config --copy
cordova-res ios --skip-config --copy
```

### Using capacitor-assets

```bash
npm install -g @capacitor/assets
npx capacitor-assets generate --android --ios
```

## Manual Setup

If you prefer to create resources manually:

1. Create `icon.png` (1024x1024px) - Your app icon
2. Create `splash.png` (2732x2732px) - Your splash screen
3. Run the generation tool or manually place them in the respective directories

## Directory Structure After Generation

```
resources/
├── android/
│   ├── icon/
│   │   ├── mipmap-mdpi/
│   │   ├── mipmap-hdpi/
│   │   ├── mipmap-xhdpi/
│   │   ├── mipmap-xxhdpi/
│   │   └── mipmap-xxxhdpi/
│   └── splash/
│       ├── drawable-port-mdpi/
│       ├── drawable-port-hdpi/
│       ├── drawable-port-xhdpi/
│       ├── drawable-port-xxhdpi/
│       └── drawable-port-xxxhdpi/
└── ios/
    ├── icon/
    └── splash/
```

## Tips

1. Use PNG format with transparency
2. Keep important content in the center (safe zone)
3. Test on multiple screen sizes
4. Use vector graphics when possible for better scaling
