# Android/Capacitor Code Archive

This directory contains the old Android/Capacitor implementation that was used before migrating to PWA.

## Migration Timeline

- **Before**: Native Android app built with Capacitor 5.x
- **After**: Progressive Web App (PWA) with Service Worker

## What Was Removed

### NPM Packages
- `@capacitor/android` ^5.7.8
- `@capacitor/cli` ^5.0.0  
- `@capacitor/core` ^5.0.0
- `adb` ^0.2.0

### NPM Scripts
- `capacitor:init`
- `capacitor:copy`
- `capacitor:open:android`

### Code Changes
- Removed Capacitor detection in `RecipeUpdateService.js`
- Removed Capacitor-specific API base URL handling in `useTelegram.js`
- Removed `capacitor://` protocol from CORS whitelist
- Removed `file://` protocol handling (was for Android APK)

## Why PWA Instead?

### Advantages of PWA
✅ **No App Store approval** - Deploy instantly  
✅ **Automatic updates** - Users always get latest version  
✅ **Cross-platform** - Works on iOS, Android, Desktop  
✅ **Smaller size** - No native wrapper overhead  
✅ **Easier maintenance** - Single codebase  
✅ **Installation** - Install directly from browser  
✅ **Offline support** - Service Worker caching  

### Disadvantages of Native App
❌ Signature conflicts on updates  
❌ Manual APK distribution  
❌ Separate build process  
❌ Android-specific bugs  
❌ Larger app size  
❌ Play Store requirements  

## Archived Files

The following files are kept for reference but no longer used:

```
android/                    # Android project directory
build-apk.bat              # Windows batch script for building APK
build.gradle               # Gradle build file
settings.gradle            # Gradle settings
BUILD_RELEASE.md           # APK build documentation
capacitor.config.json      # Capacitor configuration
```

## If You Need to Restore Android Build

1. **Reinstall packages:**
   ```bash
   npm install @capacitor/android @capacitor/cli @capacitor/core
   ```

2. **Restore package.json scripts:**
   ```json
   "capacitor:init": "npx cap init",
   "capacitor:copy": "npx cap copy",
   "capacitor:open:android": "npx cap open android"
   ```

3. **Restore Capacitor checks in code:**
   - `src/services/RecipeUpdateService.js`
   - `src/hooks/useTelegram.js`
   - `api/bug-report.js`
   - `server/server.js`

4. **Build APK:**
   ```bash
   npm run build
   npx cap copy
   cd android
   ./gradlew assembleRelease
   ```

## Current PWA Features

✅ **Install from browser** - Chrome/Safari "Add to Home Screen"  
✅ **Offline mode** - Service Worker caches assets  
✅ **iOS Dynamic Island support** - Safe area handling  
✅ **Auto-hide header** - Smooth scroll interactions  
✅ **Push notifications** - (if enabled in future)  
✅ **Background sync** - (if enabled in future)  

## PWA Installation

### Android (Chrome)
1. Open https://craft-calculator.com
2. Tap menu (⋮) → "Install app" or "Add to Home Screen"
3. App appears on home screen with icon

### iOS (Safari)
1. Open https://craft-calculator.com
2. Tap Share button → "Add to Home Screen"
3. App appears on home screen

### Desktop (Chrome/Edge)
1. Open https://craft-calculator.com
2. Click install icon (⊕) in address bar
3. App opens in standalone window

---

**Last updated:** January 2025  
**Migration completed:** After fixing iOS PWA safe-area issues
