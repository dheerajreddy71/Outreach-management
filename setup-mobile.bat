@echo off
echo ========================================
echo   Outreach Management - Mobile Setup
echo ========================================
echo.

echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
echo OK: Node.js is installed
echo.

echo [2/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo OK: Dependencies installed
echo.

echo [3/5] Building Next.js app...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo OK: Build completed
echo.

echo [4/5] Initializing Capacitor...
if not exist "capacitor.config.ts" (
    call npx cap init "Outreach Management" "com.outreach.management" --web-dir=out
)
echo OK: Capacitor initialized
echo.

echo [5/5] Adding Android platform...
if not exist "android" (
    call npx cap add android
    if errorlevel 1 (
        echo ERROR: Failed to add Android platform
        pause
        exit /b 1
    )
    echo OK: Android platform added
) else (
    echo OK: Android platform already exists
)
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Open Android Studio: npm run mobile:open:android
echo   2. Build APK in Android Studio
echo.
echo For detailed instructions, see MOBILE_SETUP.md
echo.
pause
