# PWA Installation — SHUBH SCHOOL ERP

SHUBH SCHOOL ERP is a fully installable **Progressive Web App (PWA)**. It can be added to any phone's home screen and works like a native app — no App Store, no download fees, no installation delays.

---

## Android Installation (Chrome)

1. Open the ERP URL in **Chrome** on your Android phone
2. Wait a few seconds for the "**Install SHUBH SCHOOL ERP**" banner at the bottom of the screen
3. Tap **Install**
   - OR: tap the Chrome ⋮ (three dots) menu → **Add to Home Screen**
4. The SHUBH SCHOOL ERP icon appears on your home screen
5. Tap it — the app opens full-screen without the browser address bar

### Requirements
- HTTPS must be enabled on your hosting (required for PWA)
- Chrome 70 or later (or Samsung Internet)
- Android 5.0 or later

---

## iOS Installation (Safari)

1. Open the ERP URL in **Safari** on your iPhone or iPad
   > ⚠️ Must use Safari — Chrome on iOS does not support PWA installation
2. Tap the **Share button** (the square with an upward arrow) at the bottom of the screen
3. Scroll down in the share sheet and tap **"Add to Home Screen"**
4. Edit the app name if desired (default: SHUBH SCHOOL ERP)
5. Tap **Add** in the top right
6. The icon appears on your home screen

### Requirements
- iOS 11.3 or later (iOS 16.4+ recommended for best PWA support)
- Safari browser only

---

## Offline Usage

After the first visit, SHUBH SCHOOL ERP works offline:

- All UI, styles, and JavaScript are cached by the service worker
- You can view students, receipts, and reports without internet
- Fee collection, data entry, and WhatsApp sending require an active connection
- The service worker updates automatically when you're back online

---

## Updating the App

The PWA updates automatically:

1. Connect to the internet
2. Open the app (or reload the browser tab)
3. The service worker checks for updates in the background
4. A notification appears if an update is available — tap "Refresh" to apply

You don't need to manually reinstall. The icon on your home screen always opens the latest version once updated.

---

## PWA vs Native APK

| Feature | PWA (this app) | Native APK |
|---------|---------------|------------|
| Installation | Instant via browser | Download from Play Store |
| Updates | Automatic on reload | Manual update required |
| Offline support | Yes (service worker) | Yes (bundled) |
| Camera / QR scan | Yes (HTTPS required) | Yes |
| Home screen icon | Yes | Yes |
| Play Store listing | No | Yes |
| Cost to publish | Free (just your domain) | ₹2,000/year |
| Works on desktop | Yes | No |
| Development time | Already done ✓ | Weeks with developer |

---

## Sharing the App with Teachers and Parents

Simply share the HTTPS URL of your deployed ERP. When they open it in Chrome (Android) or Safari (iOS), they can install it from the browser banner.

**Suggested message to send parents:**
> "Install our school app: Visit [https://yourdomain.com] on your phone in Chrome. Tap 'Add to Home Screen' when prompted. Login with your mobile number."

---

## Troubleshooting PWA

| Problem | Solution |
|---------|----------|
| No install banner appears | Ensure HTTPS is active. Wait 30 seconds on the page. Try clearing Chrome cache |
| Install option missing from menu | On Android, use Chrome or Samsung Internet (not Firefox). On iOS, use Safari only |
| App icon doesn't appear | Check that `manifest.json` is accessible at your domain root |
| App shows browser bar after install | Site is not meeting PWA criteria. Check HTTPS + manifest + service worker |
| Offline not working | Service worker may not have registered. Visit the page once with internet, then go offline |
