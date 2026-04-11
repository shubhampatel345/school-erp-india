# Android & iOS PWA Installation

Install SHUBH SCHOOL ERP on any phone like a native app — no App Store needed.

## Android (Chrome)

1. Open the app URL in Chrome on Android
2. Wait for the "Install" banner at the bottom of the screen
3. Tap "Install" — OR — tap ⋮ (3-dot menu) → "Add to Home Screen"
4. The app icon appears on your home screen
5. Tap it to open in full-screen mode without the browser bar

**Requirements:** HTTPS connection, Chrome 70+, Android 5+.

## iOS (Safari)

1. Open the app URL in **Safari** on iPhone or iPad
2. Tap the Share button (□↑) at the bottom of the screen
3. Scroll down and tap "Add to Home Screen"
4. Edit the app name if desired → tap "Add"
5. The app icon appears on your home screen

**Note:** Must use Safari — Chrome on iOS does not support PWA installation.

## PWA vs Native APK Comparison

| Feature | PWA (this app) | Native APK |
|---------|----------------|------------|
| Installation | Instant via browser | Download from Play Store |
| Updates | Automatic on reload | Manual update |
| Offline support | Yes (cached) | Yes (bundled) |
| Camera / QR scan | Yes (HTTPS required) | Yes |
| Home screen icon | Yes | Yes |
| Play Store listing | No | Yes |
| Cost to publish | Free | ₹2,000/year |
| Development effort | Already done ✓ | Requires developer |

## Converting PWA to APK (Optional)

If you need a Play Store APK, a developer can wrap this PWA using:
- **Capacitor** (Ionic) — converts web app to native APK
- **Bubblewrap** (Google) — generates TWA (Trusted Web Activity) APK
- **PWA Builder** (Microsoft) — free online tool at pwabuilder.com

These tools require access to the source code and an Android developer account.
