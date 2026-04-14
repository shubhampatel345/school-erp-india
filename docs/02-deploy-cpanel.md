# Deploy on cPanel Hosting

Host SHUBH SCHOOL ERP on any Indian shared hosting with cPanel. No Node.js server required on the host — the app runs entirely as a static web application.

> **Important:** SHUBH SCHOOL ERP is a static React app. You only need basic shared hosting with cPanel — no Node.js, PHP, or database required on the server.

---

## Prerequisites

- cPanel hosting account (any Indian provider — see recommended list below)
- Node.js 18+ and pnpm on your **local** computer (for building)
- A custom domain (optional but strongly recommended for HTTPS and PWA features)

---

## Step-by-Step Deployment

### Step 1 — Build the Project Locally

Run these commands on your computer:

```bash
# In the project root folder
pnpm install

# Build the frontend
cd src/frontend
pnpm build

# Build output will be at:
# src/frontend/dist/
```

### Step 2 — Locate the dist/ Folder

After the build completes, find `src/frontend/dist/`. It contains:

```
dist/
├── index.html          ← main HTML entry point
├── assets/
│   ├── index-[hash].js   ← bundled JavaScript
│   ├── index-[hash].css  ← bundled CSS
│   └── ...               ← fonts, icons, images
└── manifest.json        ← PWA manifest
```

### Step 3 — Log In to cPanel

Go to your hosting provider's cPanel URL (usually `yourdomain.com/cpanel` or as provided in your hosting welcome email).

### Step 4 — Open File Manager → public_html

In cPanel, click **File Manager**. Navigate to the `public_html/` folder — this is your website's root directory.

### Step 5 — Upload dist Folder Contents

> ⚠️ Upload the **contents** of `dist/`, not the dist folder itself.

1. Compress the `dist/` folder as a ZIP file on your computer
2. In File Manager, click **Upload** → select the ZIP file
3. After upload, right-click the ZIP → **Extract**
4. Confirm that `index.html`, `assets/`, and `manifest.json` are directly inside `public_html/`
5. Delete the ZIP file after extraction

### Step 6 — Create .htaccess (Required for React Router)

Without this file, refreshing any page will show a 404 error.

In File Manager, click **+ File**, name it `.htaccess` (with the dot prefix), and paste:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

> Note: Use `QSA,L` — not `QR,L`. The `QSA` flag correctly passes query strings.

### Step 7 — Enable SSL via Let's Encrypt

In cPanel, go to **SSL/TLS** → **Free SSL Certificate (Let's Encrypt)** → click **Issue** for your domain.

HTTPS is **mandatory** for:
- QR code camera scanner (browser security requirement)
- PWA installation on Android/iOS
- WhatsApp API calls from production

### Step 8 — Point Custom Domain (if applicable)

If you have a domain (e.g. `school.in`), update DNS at your registrar:

```
Type: A Record
Name: @ (root) or erp (subdomain)
Value: [Your server IP from cPanel → General Info]
TTL: 3600
```

DNS changes take 15 minutes to 24 hours to propagate.

### Step 9 — Verify the Deployment

1. Open `https://yourdomain.com` — the login screen should appear
2. Login with `superadmin` / `admin123`
3. Go to **Settings → School Profile** and enter your school details
4. Open the app in Chrome on your phone → look for the "Add to Home Screen" prompt
5. Test: Attendance → QR Scanner → allow camera permission

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Blank white page | Missing files or build error | Open F12 console. Rebuild with `pnpm build`. Ensure all `dist/` contents are in `public_html/` |
| 404 on page refresh | Missing .htaccess | Create `.htaccess` with the RewriteRule above. Check mod_rewrite is enabled |
| CSS / styles not loading | Wrong asset paths | Rebuild the app — Vite uses relative paths. Verify `assets/` folder is alongside `index.html` |
| Slow first load | Normal PWA behavior | Service worker caches after first visit. Subsequent loads are instant |
| Can't install PWA | Not HTTPS or wrong browser | Ensure SSL is active. Use Chrome on Android. iOS requires Safari |
| QR scanner blocked | Camera permission denied | Chrome Settings → Site Settings → Camera → find domain → Allow |
| WhatsApp CORS error | Localhost restriction | Deploy to real domain — CORS only occurs in preview/localhost |

---

## Recommended Indian Hosting Providers

| Provider | cPanel | Price/mo | SSL | Notes |
|----------|--------|----------|-----|-------|
| Hostinger India | ✅ | ₹69 | ✅ Free | Best value, fast NVMe SSD, recommended |
| MilesWeb | ✅ | ₹49 | ✅ Free | Cheapest, good for small schools |
| ResellerClub | ✅ | ₹79 | ✅ Free | Good Indian support, reliable |
| BigRock | ✅ | ₹89 | ✅ Free | ICANN accredited, popular in India |
| HostGator India | ✅ | ₹99 | ✅ Free | 24/7 support, very popular |
| Bluehost India | ✅ | ₹199 | ✅ Free | Good for larger schools |

> Node.js is **not required** for deployment — only for building on your local machine.

---

## Post-Deployment Checklist

- [ ] Login works (superadmin / admin123)
- [ ] Changed Super Admin password from default
- [ ] School profile filled with real school name and logo
- [ ] SSL certificate active (padlock in browser)
- [ ] Page refresh does not show 404 (.htaccess working)
- [ ] QR scanner camera works on mobile (HTTPS required)
- [ ] WhatsApp test message sends successfully
- [ ] PWA "Add to Home Screen" prompt appears on Android Chrome
- [ ] Backup exported and stored safely
