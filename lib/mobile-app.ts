import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Initialize Capacitor plugins for mobile app
 */
export async function initializeMobileApp() {
  // Check if running as native app
  if (!Capacitor.isNativePlatform()) {
    console.log('Running in web browser');
    return;
  }

  console.log('Initializing mobile app on:', Capacitor.getPlatform());

  try {
    // Configure Status Bar
    if (Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android') {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    }

    // Hide splash screen after initialization
    await SplashScreen.hide();

    // Handle app state changes
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active:', isActive);
      if (isActive) {
        // App came to foreground - session persists with 30-day cookie
        window.dispatchEvent(new Event('app:foreground'));
      } else {
        // App went to background
        window.dispatchEvent(new Event('app:background'));
      }
    });

    // Handle back button (Android)
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });

    // Handle app URL open (deep linking)
    App.addListener('appUrlOpen', (data) => {
      console.log('App opened with URL:', data.url);
      // Handle deep links here
      const url = new URL(data.url);
      if (url.pathname) {
        window.location.href = url.pathname;
      }
    });

    console.log('Mobile app initialized successfully');
  } catch (error) {
    console.error('Error initializing mobile app:', error);
  }
}

/**
 * Check if running as mobile app
 */
export function isMobileApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get platform information
 */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}
