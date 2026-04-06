# SHUBH SCHOOL ERP — PWA Conversion

## Current State
The app is a full-featured React + TypeScript School ERP running as a standard web app. It has all major modules (Students, Fees, Attendance, Examinations, HR, Transport, Inventory, Communicate, etc.), role-based login, localStorage persistence, and responsive layout. No PWA features exist (no manifest, no service worker, no mobile meta tags, no installability).

## Requested Changes (Diff)

### Add
- `web app manifest` (manifest.json) with app name, icons, theme color, display standalone, start_url — enables "Add to Home Screen" on Android
- `service worker` (sw.js) with precaching strategy for offline support — app works without internet after first load
- `PWA icons` at 192x192 and 512x512 pixels — required for Android home screen install
- `Apple touch icon` and `favicon.ico` — iOS/desktop support
- `Full PWA meta tags` in index.html — viewport, theme-color, apple-mobile-web-app-capable, description, og:title, etc.
- `Install prompt banner` — small "Install App" banner shown on mobile when browser fires `beforeinstallprompt`; dismissible
- `Mobile-responsive layout improvements` — bottom navigation bar on mobile (<768px) for quick tab access, touch-friendly tap targets (min 44px), swipe-friendly sidebar on mobile
- `vite-plugin-pwa` integration in vite.config to auto-generate service worker and inject manifest

### Modify
- `index.html` — add all PWA meta tags, manifest link, apple touch icon, theme-color
- `Layout.tsx` — add mobile bottom navigation bar for small screens, hide top sidebar on mobile, improve touch targets
- `Sidebar.tsx` — convert to sheet/drawer on mobile (overlay), full sidebar on desktop
- `Header.tsx` — ensure mobile-friendly spacing and tap targets

### Remove
- Nothing removed

## Implementation Plan
1. Generate SHUBH SCHOOL ERP app icons (192x192, 512x512, 180x180 apple touch)
2. Create `src/frontend/public/manifest.json` with all required PWA fields
3. Create `src/frontend/public/sw.js` — service worker with cache-first strategy for assets, network-first for API
4. Update `src/frontend/index.html` — add all PWA meta tags and manifest link
5. Update `src/frontend/src/components/layout/Layout.tsx` — add mobile bottom nav bar, install prompt banner
6. Update `src/frontend/src/components/layout/Sidebar.tsx` — mobile sheet/drawer overlay
7. Update `src/frontend/src/components/layout/Header.tsx` — mobile-friendly
8. Register service worker in `src/frontend/src/main.tsx`
