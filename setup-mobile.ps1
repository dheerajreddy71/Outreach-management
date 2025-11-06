#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Outreach Management - Mobile Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/5] Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "OK: Node.js $nodeVersion is installed" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Install dependencies
Write-Host "[2/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Dependencies installed" -ForegroundColor Green
Write-Host ""

# Build Next.js app
Write-Host "[3/5] Building Next.js app for mobile..." -ForegroundColor Yellow
$env:BUILD_MOBILE = "true"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Build completed" -ForegroundColor Green
Write-Host ""

# Initialize Capacitor
Write-Host "[4/5] Initializing Capacitor..." -ForegroundColor Yellow
if (-not (Test-Path "capacitor.config.ts")) {
    npx cap init "Outreach Management" "com.outreach.management" --web-dir=out
}
Write-Host "OK: Capacitor initialized" -ForegroundColor Green
Write-Host ""

# Add Android platform
Write-Host "[5/5] Adding Android platform..." -ForegroundColor Yellow
if (-not (Test-Path "android")) {
    npx cap add android
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to add Android platform" -ForegroundColor Red
        Write-Host "Make sure Android Studio is installed" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "OK: Android platform added" -ForegroundColor Green
}
else {
    Write-Host "OK: Android platform already exists" -ForegroundColor Green
}
Write-Host ""

# Sync Capacitor
Write-Host "[6/6] Syncing Capacitor..." -ForegroundColor Yellow
npx cap sync
Write-Host "OK: Capacitor synced" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open Android Studio:" -ForegroundColor White
Write-Host "     npm run mobile:open:android" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. In Android Studio:" -ForegroundColor White
Write-Host "     - Wait for Gradle sync to complete" -ForegroundColor White
Write-Host "     - Click Build > Build Bundle(s) / APK(s) > Build APK(s)" -ForegroundColor White
Write-Host "     - APK will be in: android/app/build/outputs/apk/debug/" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see MOBILE_SETUP.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
