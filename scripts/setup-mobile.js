#!/usr/bin/env node

/**
 * Mobile App Setup Script
 * Prepares the Next.js app for Capacitor mobile build
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up mobile app build...\n');

// Step 1: Install Capacitor dependencies
console.log('📦 Installing Capacitor dependencies...');
try {
  execSync('npm install --save-dev @capacitor/cli', { stdio: 'inherit' });
  execSync('npm install @capacitor/core @capacitor/app @capacitor/splash-screen @capacitor/status-bar', { stdio: 'inherit' });
  console.log('✅ Capacitor dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies');
  process.exit(1);
}

// Step 2: Build Next.js app for static export
console.log('🔨 Building Next.js app for mobile...');
try {
  // Set environment variable for mobile build
  process.env.BUILD_MOBILE = 'true';
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Next.js build completed\n');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Step 3: Initialize Capacitor (if not already initialized)
console.log('⚡ Initializing Capacitor...');
try {
  if (!fs.existsSync('capacitor.config.ts')) {
    execSync('npx cap init "Outreach Management" "com.outreach.management" --web-dir=out', { stdio: 'inherit' });
  }
  console.log('✅ Capacitor initialized\n');
} catch (error) {
  console.log('⚠️  Capacitor already initialized or config exists\n');
}

// Step 4: Add Android platform
console.log('🤖 Adding Android platform...');
try {
  if (!fs.existsSync('android')) {
    execSync('npx cap add android', { stdio: 'inherit' });
    console.log('✅ Android platform added\n');
  } else {
    console.log('⚠️  Android platform already exists\n');
  }
} catch (error) {
  console.error('❌ Failed to add Android platform');
}

// Step 5: Add iOS platform (if on macOS)
if (process.platform === 'darwin') {
  console.log('🍎 Adding iOS platform...');
  try {
    if (!fs.existsSync('ios')) {
      execSync('npx cap add ios', { stdio: 'inherit' });
      console.log('✅ iOS platform added\n');
    } else {
      console.log('⚠️  iOS platform already exists\n');
    }
  } catch (error) {
    console.error('❌ Failed to add iOS platform');
  }
} else {
  console.log('⚠️  iOS platform can only be added on macOS\n');
}

// Step 6: Sync Capacitor
console.log('🔄 Syncing Capacitor...');
try {
  execSync('npx cap sync', { stdio: 'inherit' });
  console.log('✅ Capacitor sync completed\n');
} catch (error) {
  console.error('❌ Failed to sync Capacitor');
}

// Step 7: Create resources directory for icons and splash screens
console.log('🎨 Creating resources directory...');
const resourcesDir = path.join(__dirname, 'resources');
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
  console.log('✅ Resources directory created\n');
} else {
  console.log('⚠️  Resources directory already exists\n');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✨ Mobile app setup completed successfully!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📱 Next steps:\n');
console.log('1. For Android:');
console.log('   npm run mobile:open:android');
console.log('   Then build APK in Android Studio\n');

if (process.platform === 'darwin') {
  console.log('2. For iOS:');
  console.log('   npm run mobile:open:ios');
  console.log('   Then build in Xcode\n');
}

console.log('3. To update app after changes:');
console.log('   npm run mobile:build\n');

console.log('🎉 Happy coding!');
